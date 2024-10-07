const Locationhl = require("../../models/locationhl");
const Client = require("../../models/client");
const { default: axios } = require("axios");
const ActivityLog = require("../../models/activity");

// Unified Webhook Handler
const handleRepairDeskWebhook = async (req, res) => {
  const date = new Date();
  const text = req.body.text;
  console.log(`Webhook received at ${date.toLocaleTimeString()}`);
  console.log(`Body:`, req.body);

  try {
    switch (true) {
      case /Added New Customer/.test(text):
        await handleCustomerCreation(req, res, text);
        break;
      case /Added new Ticket/.test(text):
        await handleNewTicketAdded(req, res, text);
        break;
      case /Updated ticket Status/.test(text):
        await handleTicketStatusChanged(req, res, text);
        break;
      case /Updated Invoice/.test(text):
        await handleInvoicePaid(req, res, text);
        break;
      case /Payment added in invoice/.test(text):
        await handlePaymentAdded(req, res, text);
        break;
      default:
        console.log("Unhandled event type");
        res.status(200).send("Unhandled event type");
    }
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Customer Created (RepairDesk)
const handleCustomerCreation = async (req, res, text) => {
  console.log("/////*******************************************/////");

  const customerIdMatch = text.match(/id=(\d+)\|/);
  const customerId = customerIdMatch ? customerIdMatch[1] : null;

  const subdomainMatch = text.match(/https:\/\/([^\.]+)\.repairdesk\.co/);
  const subdomain = subdomainMatch ? subdomainMatch[1] : null;

  // Get Business Location
  const customerLocation = await Locationhl.findOne({
    serviceSubdomain: subdomain,
  });

  if (!customerLocation) {
    res.status(404).send("Location not found!");
    return;
  }

  const client = await Client.findOne({
    user_id: customerLocation.user_id,
  });

  // Refresh Highlvel Access Token
  let new_access_token;

  const data = {
    client_id: process.env.HL_CLIENT_ID,
    client_secret: process.env.HL_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: customerLocation.hl_refresh_token,
    user_type: "Location",
    redirect_uri: process.env.HL_REDIRECT_URL,
  };

  const queryString = new URLSearchParams(data).toString();

  try {
    const refreshTokenRes = await axios.post(
      process.env.HL_TOKEN_URL + "/oauth/token",
      queryString
    );
    // console.log("refreshTokenRes", refreshTokenRes.data);
    new_access_token = refreshTokenRes.data.access_token;

    // Update Access token in Database
    await Locationhl.updateOne(
      {
        hl_location_id: refreshTokenRes.data.locationId,
      },
      {
        $set: {
          hl_access_token: refreshTokenRes.data.access_token,
          hl_refresh_token: refreshTokenRes.data.refresh_token,
        },
      }
    );
  } catch (error) {
    console.log(error);
  }

  console.log(`Handling customer creation for ${customerId}`);

  try {
    // Get Customer from RepairDesk
    const getCustomerRes = await axios.get(
      `https://api.repairdesk.co/api/web/v1/customers/${customerId}?api_key=${customerLocation.serviceApiKey}`
    );
    console.log("getCustomerRes", getCustomerRes.data.data);

    // Create Payload
    const customerEmail =
      getCustomerRes?.data?.data?.email ||
      getCustomerRes?.data?.data?.emails[0]?.value ||
      null;

    const customerPhone =
      getCustomerRes?.data?.data?.phone ||
      getCustomerRes?.data?.data?.mobile ||
      getCustomerRes?.data?.data?.phones[0]?.value ||
      getCustomerRes?.data?.data?.mobiles[0]?.value ||
      null;

    const payload = {
      email: customerEmail,
      phone: customerPhone?.replace(/[\s-]+/g, ""),
      firstName: getCustomerRes.data.data.first_name,
      lastName: getCustomerRes.data.data.last_name,
      name: getCustomerRes.data.data.fullname,
      address1: getCustomerRes.data.data.address1,
      city: getCustomerRes.data.data.city,
      state: getCustomerRes.data.data.state,
      country: getCustomerRes.data.data.country || "US",
      locationId: customerLocation.hl_location_id,
    };

    try {
      // Check if customer exists in Highlevel
      let duplicateCustomerRes =
        payload.email &&
        (await axios.get(
          `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${
            customerLocation.hl_location_id
          }${`&email=${encodeURIComponent(payload.email)}`}`,
          {
            headers: {
              Authorization: `Bearer ${new_access_token}`,
              Version: "2021-07-28",
            },
          }
        ));

      // If no customer is found by email, check by phone
      if (
        duplicateCustomerRes == undefined ||
        duplicateCustomerRes.data.contact == null
      ) {
        if (payload.phone) {
          duplicateCustomerRes = await axios.get(
            `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${
              customerLocation.hl_location_id
            }&number=${encodeURIComponent(payload.phone)}`,
            {
              headers: {
                Authorization: `Bearer ${new_access_token}`,
                Version: "2021-07-28",
              },
            }
          );
        }
      }

      console.log("duplicateCustomerRes", duplicateCustomerRes.data);

      // If customer exists, Update it
      if (duplicateCustomerRes.data.contact != null) {
        delete payload.locationId;
        try {
          const updateHighlevelCustomerRes = await axios.put(
            `https://services.leadconnectorhq.com/contacts/${duplicateCustomerRes.data.contact.id}`,
            payload,
            {
              headers: {
                Authorization: `Bearer ${new_access_token}`,
                Version: "2021-07-28",
              },
            }
          );
          console.log(
            "RepairDesk Customer Synced with Existing Highlevel Successfully",
            updateHighlevelCustomerRes.data
          );

          // Log success
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            businessName: client.business_name,
            eventType: "Success",
            event: "Customer Created in RepairDesk",
            platform: "RepairDesk",
            message: `Customer <b>${
              payload.email || payload.phone
            }</b> Synced with Existing Highlevel Customer Successfully`,
            customData: updateHighlevelCustomerRes.data,
          });
        } catch (error) {
          console.error(error.response);

          // Log failure
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            businessName: client.business_name,
            eventType: "Failure",
            message: `Error syncing RepairDesk customer with Existing Highlevel Customer ${
              error.response ? error.response.data.message : ""
            }`,
            event: "Customer Created in RepairDesk",
            platform: "RepairDesk",
            customData: error.response ? error.response.data : error,
          });
        }
      }
      // If not exists, Create one
      else {
        try {
          const highlevelCustomerRes = await axios.post(
            "https://services.leadconnectorhq.com/contacts/",
            payload,
            {
              headers: {
                Authorization: `Bearer ${new_access_token}`,
                Version: "2021-07-28",
              },
            }
          );
          console.log(
            "RepairDesk Customer Synced with Highlevel Successfully",
            highlevelCustomerRes.data
          );

          // Log success
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            businessName: client.business_name,
            eventType: "Success",
            event: "Customer Created in RepairDesk",
            platform: "RepairDesk",
            message: `Customer <b>${
              payload.email || payload.phone
            }</b> Synced with Highlevel Successfully`,
            customData: highlevelCustomerRes.data,
          });
        } catch (error) {
          console.error(error.response);

          // Log failure
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            businessName: client.business_name,
            eventType: "Failure",
            message: `Error syncing RepairDesk customer in Highlevel ${
              error.response ? error.response.data.message : ""
            }`,
            event: "Customer Created in RepairDesk",
            platform: "RepairDesk",
            customData: error.response ? error.response.data : error,
          });
        }
      }
    } catch (error) {
      console.error(error.response);
    }
  } catch (error) {
    console.error(error);

    // Log Failure for General Error
    await ActivityLog.create({
      user_id: customerLocation.user_id,
      businessName: client.business_name,
      eventType: "Failure",
      message: error.response
        ? error.response.data.message
        : `Something went wrong! Maybe it is due to recieving incomplete request from RepairDesk`,
      event: "Customer Created in RepairDesk",
      platform: "RepairDesk",
      customData: error.response ? error.response.data : error,
    });
  }
  console.log("/////*******************************************/////");
};

// Ticket Added (RepairDesk)
const handleNewTicketAdded = async (req, res, text) => {
  console.log("/////*******************************************/////");

  const ticketIdMatch = text.match(/ticket\/view&id=(\d+)/);
  const ticketId = ticketIdMatch ? ticketIdMatch[1] : null;

  const subdomainMatch = text.match(/https:\/\/([^\.]+)\.repairdesk\.co/);
  const subdomain = subdomainMatch ? subdomainMatch[1] : null;

  const customerLocation = await Locationhl.findOne({
    serviceSubdomain: subdomain,
  });

  if (!customerLocation) {
    res.status(404).send("Location not found!");
    return;
  }

  const client = await Client.findOne({
    user_id: customerLocation.user_id,
  });

  // Refresh Highlvel Access Token
  let new_access_token;

  const data = {
    client_id: process.env.HL_CLIENT_ID,
    client_secret: process.env.HL_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: customerLocation.hl_refresh_token,
    user_type: "Location",
    redirect_uri: process.env.HL_REDIRECT_URL,
  };

  const queryString = new URLSearchParams(data).toString();

  try {
    const refreshTokenRes = await axios.post(
      process.env.HL_TOKEN_URL + "/oauth/token",
      queryString
    );
    new_access_token = refreshTokenRes.data.access_token;

    // Update Access token in Database
    await Locationhl.updateOne(
      {
        hl_location_id: refreshTokenRes.data.locationId,
      },
      {
        $set: {
          hl_access_token: refreshTokenRes.data.access_token,
          hl_refresh_token: refreshTokenRes.data.refresh_token,
        },
      }
    );
  } catch (error) {
    console.log(error);
  }

  try {
    const getTicketRes = await axios.get(
      `https://api.repairdesk.co/api/web/v1/tickets/${ticketId}?api_key=${customerLocation.serviceApiKey}`
    );
    console.log("getTicketRes", getTicketRes.data.data);

    // Extract first Ticket Status
    let ticketStatus = null;

    // Check if the devices array exists and is not empty
    if (
      getTicketRes.data.data.devices &&
      getTicketRes.data.data.devices.length > 0
    ) {
      ticketStatus = getTicketRes.data.data.devices[0].status.name;
    }

    // Create Payload
    const customerEmail =
      getTicketRes?.data?.data?.summary?.customer?.email ||
      getTicketRes?.data?.data?.summary?.customer?.emails[0]?.value ||
      null;

    const customerPhone =
      getTicketRes?.data?.data?.summary?.customer?.phone ||
      getTicketRes?.data?.data?.summary?.customer?.mobile ||
      getTicketRes?.data?.data?.summary?.customer?.phones[0]?.value ||
      getTicketRes?.data?.data?.summary?.customer?.mobiles[0]?.value ||
      null;

    const payload = {
      email: customerEmail,
      phone: customerPhone?.replace(/[\s-]+/g, ""),
      firstName: getTicketRes.data.data.summary.customer.first_name,
      lastName: getTicketRes.data.data.summary.customer.last_name,
      name: getTicketRes.data.data.summary.customer.fullname,
      address1: getTicketRes.data.data.summary.customer.address1,
      city: getTicketRes.data.data.summary.customer.city,
      state: getTicketRes.data.data.summary.customer.state,
      country: getTicketRes.data.data.summary.customer.country || "US",
      locationId: customerLocation.hl_location_id,
    };

    console.log("payload", payload);

    if (!payload.email && !payload.phone) {
      console.log("Customer didn't provided email or phone");
      return;
    }

    // Step 1: Check if customer exists by email in Highlevel
    let duplicateCustomerRes =
      payload.email &&
      (await axios.get(
        `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${
          customerLocation.hl_location_id
        }${payload.email ? `&email=${encodeURIComponent(payload.email)}` : ""}`,
        {
          headers: {
            Authorization: `Bearer ${new_access_token}`,
            Version: "2021-07-28",
          },
        }
      ));

    // If no customer is found by email, check by phone
    if (
      duplicateCustomerRes == undefined ||
      duplicateCustomerRes.data.contact == null
    ) {
      if (payload.phone) {
        duplicateCustomerRes = await axios.get(
          `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${
            customerLocation.hl_location_id
          }&number=${encodeURIComponent(payload.phone)}`,
          {
            headers: {
              Authorization: `Bearer ${new_access_token}`,
              Version: "2021-07-28",
            },
          }
        );
      }
    }

    // Step 2: If customer exists (either by email or phone), update
    if (duplicateCustomerRes.data.contact != null) {
      try {
        delete payload.locationId; // Removing locationId for update
        const updateHighlevelCustomerRes = await axios.put(
          `https://services.leadconnectorhq.com/contacts/${duplicateCustomerRes.data.contact.id}?locationId=${customerLocation.hl_location_id}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${new_access_token}`,
              Version: "2021-07-28",
            },
          }
        );

        if (ticketStatus) {
          // Add Tag to the Existing Customer
          try {
            const addTagRes = await axios.post(
              `https://services.leadconnectorhq.com/contacts/${duplicateCustomerRes.data.contact.id}/tags`,
              {
                tags: [ticketStatus],
              },
              {
                headers: {
                  Authorization: `Bearer ${new_access_token}`,
                  Version: "2021-07-28",
                },
              }
            );

            console.log(
              `Existing Customer ${
                payload.email || payload.phone
              } Updated in Highlevel and a Tag ${ticketStatus} is added Successfully`
            );

            // Log Success
            await ActivityLog.create({
              user_id: customerLocation.user_id,
              businessName: client.business_name,
              eventType: "Success",
              event: "Ticket and Customer Created in RepairDesk",
              platform: "RepairDesk",
              message: `Existing Customer <b>${
                payload.email || payload.phone
              }</b> Updated in Highlevel and a Tag ${ticketStatus} is added Successfully`,
              customData: {
                customerUpdate: updateHighlevelCustomerRes.data,
                tagAdded: addTagRes.data,
              },
            });
          } catch (tagError) {
            console.error("Error adding tag in Highlevel", tagError);

            const errorMessage =
              tagError.response && tagError.response.data
                ? tagError.response.data.message
                : "";

            // Log Failure for Tag
            await ActivityLog.create({
              user_id: customerLocation.user_id,
              businessName: client.business_name,
              eventType: "Failure",
              event: "Ticket and Customer Created in RepairDesk",
              platform: "RepairDesk",
              message: `Error adding tag in Existing Highlevel's customer <b>${
                payload.email || payload.phone
              }</b>: ${errorMessage}`,
              customData: tagError.response ? tagError.response.data : tagError,
            });
          }
        } else {
          console.log("No device status available, so no tag added");
        }
      } catch (customerUpdateError) {
        console.error(
          "Error updating existing customer in Highlevel",
          customerUpdateError
        );

        const errorMessage =
          customerUpdateError.response && customerUpdateError.response.data
            ? customerUpdateError.response.data.message
            : "";

        // Log Failure for Customer Update
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          businessName: client.business_name,
          eventType: "Failure",
          event: "Ticket and Customer Created in RepairDesk",
          platform: "RepairDesk",
          message: `Error Updating Existing Customer in Highlevel <b>${
            payload.email || payload.phone
          }</b>: ${errorMessage}`,
          customData: customerUpdateError.response
            ? customerUpdateError.response.data
            : customerUpdateError,
        });
      }
    }

    // Step 3: Create a New Customer if not found by email or phone
    else {
      try {
        const highlevelCustomerRes = await axios.post(
          "https://services.leadconnectorhq.com/contacts/",
          {
            ...payload,
            ...(ticketStatus ? { tags: [ticketStatus] } : {}), // Add tag if ticketStatus exists
          },
          {
            headers: {
              Authorization: `Bearer ${new_access_token}`,
              Version: "2021-07-28",
            },
          }
        );

        console.log(
          `RepairDesk Customer Synced with Highlevel ${
            ticketStatus ? ` and a tag ${ticketStatus} is added` : ""
          } Successfully`,
          highlevelCustomerRes.data
        );

        // Log Success
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          businessName: client.business_name,
          eventType: "Success",
          event: "Ticket and Customer Created in RepairDesk",
          platform: "RepairDesk",
          message: `Customer <b>${
            payload.email || payload.phone
          }</b> Synced in Highlevel ${
            ticketStatus ? ` and a Tag ${ticketStatus} is added` : ""
          } Successfully`,
          customData: highlevelCustomerRes.data,
        });
      } catch (error) {
        console.error("Error creating customer in Highlevel", error);

        const errorMessage =
          error.response && error.response.data
            ? error.response.data.message
            : "";

        // Log Failure for Customer Creation
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          businessName: client.business_name,
          eventType: "Failure",
          event: "Ticket and Customer Created in RepairDesk",
          platform: "RepairDesk",
          message: `Error syncing customer in Highlevel: ${errorMessage}`,
          customData: error.response ? error.response.data : error,
        });
      }
    }
  } catch (error) {
    console.error(error);

    // Log Failure for General Error
    await ActivityLog.create({
      user_id: customerLocation.user_id,
      businessName: client.business_name,
      eventType: "Failure",
      message: error.response
        ? error.response.data.message
        : `Something went wrong! Maybe it is due to recieving incomplete request from RepairDesk`,
      event: "Ticket and Customer Created in RepairDesk",
      platform: "RepairDesk",
      customData: error.response ? error.response.data : error,
    });
  }
  console.log("/////*******************************************/////");
};

// Ticket Status Changed (RepairDesk)
const handleTicketStatusChanged = async (req, res, text) => {
  console.log("/////*******************************************/////");

  const ticketIdMatch = text.match(/Ticket Id :.*<.+?id=(\d+)\|/);
  const ticketId = ticketIdMatch ? ticketIdMatch[1] : null;

  const statusMatch = text.match(/Status from: (.+?) to : (.+?) Ticket/);
  const statusFrom = statusMatch ? statusMatch[1] : null;
  const statusTo = statusMatch ? statusMatch[2] : null;

  const subdomainMatch = text.match(/https:\/\/([^\.]+)\.repairdesk\.co/);
  const subdomain = subdomainMatch ? subdomainMatch[1] : null;

  const customerLocation = await Locationhl.findOne({
    serviceSubdomain: subdomain,
  });

  if (!customerLocation) {
    res.status(404).send("Location not found!");
    return;
  }

  const client = await Client.findOne({
    user_id: customerLocation.user_id,
  });

  // Refresh Highlvel Access Token
  let new_access_token;

  const data = {
    client_id: process.env.HL_CLIENT_ID,
    client_secret: process.env.HL_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: customerLocation.hl_refresh_token,
    user_type: "Location",
    redirect_uri: process.env.HL_REDIRECT_URL,
  };

  const queryString = new URLSearchParams(data).toString();

  try {
    const refreshTokenRes = await axios.post(
      process.env.HL_TOKEN_URL + "/oauth/token",
      queryString
    );
    // console.log("refreshTokenRes", refreshTokenRes.data);
    new_access_token = refreshTokenRes.data.access_token;

    // Update Access token in Database
    await Locationhl.updateOne(
      {
        hl_location_id: refreshTokenRes.data.locationId,
      },
      {
        $set: {
          hl_access_token: refreshTokenRes.data.access_token,
          hl_refresh_token: refreshTokenRes.data.refresh_token,
        },
      }
    );
  } catch (error) {
    console.log(error);
  }

  try {
    const getTicketRes = await axios.get(
      `https://api.repairdesk.co/api/web/v1/tickets/${ticketId}?api_key=${customerLocation.serviceApiKey}`
    );
    console.log("getTicketRes", getTicketRes.data.data);

    const customerEmail =
      getTicketRes?.data?.data?.summary?.customer?.email ||
      getTicketRes?.data?.data?.summary?.customer?.emails[0]?.value ||
      null;
    const customerPhone =
      getTicketRes?.data?.data?.summary?.customer?.phone ||
      getTicketRes?.data?.data?.summary?.customer?.mobile ||
      getTicketRes?.data?.data?.summary?.customer?.phones[0]?.value ||
      getTicketRes?.data?.data?.summary?.customer?.mobiles[0]?.value ||
      null;

    const highlevelCustomerRes = await axios.post(
      "https://services.leadconnectorhq.com/contacts/search",
      {
        locationId: customerLocation.hl_location_id,
        page: 1,
        pageLimit: 20,
        filters: [
          customerEmail
            ? {
                field: "email",
                operator: "eq",
                value: customerEmail,
              }
            : {
                field: "phone",
                operator: "eq",
                value: customerPhone?.replace(/[\s-]+/g, ""),
              },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${new_access_token}`,
          Version: "2021-07-28",
        },
      }
    );
    console.log("highlevelCustomerRes", highlevelCustomerRes.data);

    const searchedCustomers = highlevelCustomerRes.data.contacts;

    // Add a tag in Highlevel's Customer
    if (searchedCustomers.length > 0) {
      try {
        const addTagRes = await axios.post(
          `https://services.leadconnectorhq.com/contacts/${searchedCustomers[0].id}/tags`,
          {
            tags: [statusTo],
          },
          {
            headers: {
              Authorization: `Bearer ${new_access_token}`,
              Version: "2021-07-28",
            },
          }
        );
        console.log(
          `${statusTo} Tag added in Highlevel's customer <b>${
            customerEmail || customerPhone
          }</b>`,
          addTagRes.data
        );

        // Log success
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          businessName: client.business_name,
          eventType: "Success",
          event: "Ticket Status Changed in RepairDesk",
          platform: "RepairDesk",
          message: `${statusTo} Tag added in Highlevel's customer <b>${
            customerEmail || customerPhone
          }</b>`,
          customData: addTagRes.data,
        });
      } catch (error) {
        console.error(error);

        // Log failure
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          businessName: client.business_name,
          eventType: "Failure",
          event: "Ticket Status Changed in RepairDesk",
          platform: "RepairDesk",
          message: `Error adding tag in Highlevel's Customer <b>${
            customerEmail || customerPhone
          }</b>`,
          customData: error.response ? error.response.data : error,
        });
      }
    }
  } catch (error) {
    console.error(error);

    // Log Failure for General Error
    await ActivityLog.create({
      user_id: customerLocation.user_id,
      businessName: client.business_name,
      eventType: "Failure",
      message: error.response
        ? error.response.data.message
        : `Something went wrong! Maybe it is due to recieving incomplete request from RepairDesk`,
      event: "Ticket Status Changed in RepairDesk",
      platform: "RepairDesk",
      customData: error.response ? error.response.data : error,
    });
  }
  console.log("/////*******************************************/////");
};

// Invoice Paid (RepairDesk)
const handleInvoicePaid = async (req, res, text) => {
  console.log("/////*******************************************/////");
  const invoiceIdMatch = text.match(/id=(\d+)\|/);
  const invoiceId = invoiceIdMatch ? invoiceIdMatch[1] : null;

  const subdomainMatch = text.match(/https:\/\/([^\.]+)\.repairdesk\.co/);
  const subdomain = subdomainMatch ? subdomainMatch[1] : null;

  const customerLocation = await Locationhl.findOne({
    serviceSubdomain: subdomain,
  });

  if (!customerLocation) {
    res.status(404).send("Location not found!");
    return;
  }

  const client = await Client.findOne({
    user_id: customerLocation.user_id,
  });

  // Refresh Highlvel Access Token
  let new_access_token;

  const data = {
    client_id: process.env.HL_CLIENT_ID,
    client_secret: process.env.HL_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: customerLocation.hl_refresh_token,
    user_type: "Location",
    redirect_uri: process.env.HL_REDIRECT_URL,
  };

  const queryString = new URLSearchParams(data).toString();

  try {
    const refreshTokenRes = await axios.post(
      process.env.HL_TOKEN_URL + "/oauth/token",
      queryString
    );
    // console.log("refreshTokenRes", refreshTokenRes.data);
    new_access_token = refreshTokenRes.data.access_token;

    // Update Access token in Database
    await Locationhl.updateOne(
      {
        hl_location_id: refreshTokenRes.data.locationId,
      },
      {
        $set: {
          hl_access_token: refreshTokenRes.data.access_token,
          hl_refresh_token: refreshTokenRes.data.refresh_token,
        },
      }
    );
  } catch (error) {
    console.log(error);
  }

  try {
    const getInvoiceRes = await axios.get(
      `https://api.repairdesk.co/api/web/v1/invoices/${invoiceId}?api_key=${customerLocation.serviceApiKey}`
    );
    console.log("getInvoiceRes", getInvoiceRes.data.data);

    const customerEmail =
      getInvoiceRes?.data?.data?.summary?.customer?.email ||
      getInvoiceRes?.data?.data?.summary?.customer?.emails[0]?.value ||
      null;
    const customerPhone =
      getInvoiceRes?.data?.data?.summary?.customer?.phone ||
      getInvoiceRes?.data?.data?.summary?.customer?.mobile ||
      getInvoiceRes?.data?.data?.summary?.customer?.phones[0]?.value ||
      getInvoiceRes?.data?.data?.summary?.customer?.mobiles[0]?.value ||
      null;

    if (getInvoiceRes.data.data.summary.status.toLowerCase() == "paid") {
      console.log("Inovice is paid now");
      const highlevelCustomerRes = await axios.post(
        "https://services.leadconnectorhq.com/contacts/search",
        {
          locationId: customerLocation.hl_location_id,
          page: 1,
          pageLimit: 20,
          filters: [
            customerEmail
              ? {
                  field: "email",
                  operator: "eq",
                  value: customerEmail,
                }
              : {
                  field: "phone",
                  operator: "eq",
                  value: customerPhone?.replace(/[\s-]+/g, ""),
                },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${new_access_token}`,
            Version: "2021-07-28",
          },
        }
      );
      console.log("highlevelCustomerRes", highlevelCustomerRes.data);

      const searchedCustomers = highlevelCustomerRes.data.contacts;

      // Add a tag in Highlevel's Customer
      if (searchedCustomers.length > 0) {
        try {
          const addTagRes = await axios.post(
            `https://services.leadconnectorhq.com/contacts/${searchedCustomers[0].id}/tags`,
            {
              tags: ["Invoice Paid"],
            },
            {
              headers: {
                Authorization: `Bearer ${new_access_token}`,
                Version: "2021-07-28",
              },
            }
          );
          console.log(
            `Invoice Paid Tag added in Highlevel's customer ${customerEmail}`,
            addTagRes.data
          );

          // Log success
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            businessName: client.business_name,
            eventType: "Success",
            event: "Invoice Paid in RepairDesk",
            platform: "RepairDesk",
            message: `Invoice Paid Tag added in Highlevel's customer <b>${
              customerEmail || customerPhone
            }</b>`,
            customData: addTagRes.data,
          });
        } catch (error) {
          console.error(error);

          // Log failure
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            businessName: client.business_name,
            eventType: "Failure",
            event: "Invoice Paid in RepairDesk",
            platform: "RepairDesk",
            message: `Error adding tag in Highlevel's Customer <b>${
              customerEmail || customerPhone
            }</b>`,
            customData: error.response ? error.response.data : error,
          });
        }
      }
    } else {
      console.log("Inovice is not paid yet");
    }
  } catch (error) {
    console.error(error.response);

    // Log Failure for General Error
    await ActivityLog.create({
      user_id: customerLocation.user_id,
      businessName: client.business_name,
      eventType: "Failure",
      message: error.response
        ? error.response.data.message
        : `Something went wrong! Maybe it is due to recieving incomplete request from RepairDesk`,
      event: "Invoice Paid in RepairDesk",
      platform: "RepairDesk",
      customData: error.response ? error.response.data : error,
    });
  }
  res.status(200).send("Webhook Recieved Successfully");

  console.log("/////*******************************************/////");
};

// Payment Added in invoice (RepairDesk)
const handlePaymentAdded = async (req, res, text) => {
  console.log("/////*******************************************/////");
  const invoiceIdMatch = text.match(/id=(\d+)\|/);
  const invoiceId = invoiceIdMatch ? invoiceIdMatch[1] : null;

  const subdomainMatch = text.match(/https:\/\/([^\.]+)\.repairdesk\.co/);
  const subdomain = subdomainMatch ? subdomainMatch[1] : null;

  const customerLocation = await Locationhl.findOne({
    serviceSubdomain: subdomain,
  });

  if (!customerLocation) {
    res.status(404).send("Location not found!");
    return;
  }

  const client = await Client.findOne({
    user_id: customerLocation.user_id,
  });

  // Refresh Highlvel Access Token
  let new_access_token;

  const data = {
    client_id: process.env.HL_CLIENT_ID,
    client_secret: process.env.HL_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: customerLocation.hl_refresh_token,
    user_type: "Location",
    redirect_uri: process.env.HL_REDIRECT_URL,
  };

  const queryString = new URLSearchParams(data).toString();

  try {
    const refreshTokenRes = await axios.post(
      process.env.HL_TOKEN_URL + "/oauth/token",
      queryString
    );
    // console.log("refreshTokenRes", refreshTokenRes.data);
    new_access_token = refreshTokenRes.data.access_token;

    // Update Access token in Database
    await Locationhl.updateOne(
      {
        hl_location_id: refreshTokenRes.data.locationId,
      },
      {
        $set: {
          hl_access_token: refreshTokenRes.data.access_token,
          hl_refresh_token: refreshTokenRes.data.refresh_token,
        },
      }
    );
  } catch (error) {
    console.log(error);
  }

  try {
    const getInvoiceRes = await axios.get(
      `https://api.repairdesk.co/api/web/v1/invoices/${invoiceId}?api_key=${customerLocation.serviceApiKey}`
    );
    console.log("getInvoiceRes", getInvoiceRes.data.data);

    // Get Ticket by ID
    const getTicketRes = await axios.get(
      `https://api.repairdesk.co/api/web/v1/tickets/${getInvoiceRes.data.data.summary.ticket.id}?api_key=${customerLocation.serviceApiKey}`
    );
    console.log("getTicketRes", getTicketRes.data.data);

    const ticketStatus = getTicketRes.data.data.devices[0].status.name;
    const customerEmail =
      getInvoiceRes?.data?.data?.summary?.customer?.email ||
      getInvoiceRes?.data?.data?.summary?.customer?.emails[0]?.value ||
      null;
    const customerPhone =
      getInvoiceRes?.data?.data?.summary?.customer?.phone ||
      getInvoiceRes?.data?.data?.summary?.customer?.mobile ||
      getInvoiceRes?.data?.data?.summary?.customer?.phones[0]?.value ||
      getInvoiceRes?.data?.data?.summary?.customer?.mobiles[0]?.value ||
      null;

    if (getInvoiceRes.data.data.summary.status.toLowerCase() == "paid") {
      console.log("Inovice is paid now");
      const highlevelCustomerRes = await axios.post(
        "https://services.leadconnectorhq.com/contacts/search",
        {
          locationId: customerLocation.hl_location_id,
          page: 1,
          pageLimit: 20,
          filters: [
            customerEmail
              ? {
                  field: "email",
                  operator: "eq",
                  value: customerEmail,
                }
              : {
                  field: "phone",
                  operator: "eq",
                  value: customerPhone?.replace(/[\s-]+/g, ""),
                },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${new_access_token}`,
            Version: "2021-07-28",
          },
        }
      );
      // console.log("highlevelCustomerRes", highlevelCustomerRes.data);

      const searchedCustomers = highlevelCustomerRes.data.contacts;

      // Add a tag in Highlevel's Customer
      if (searchedCustomers.length > 0) {
        try {
          const addTagRes = await axios.post(
            `https://services.leadconnectorhq.com/contacts/${searchedCustomers[0].id}/tags`,
            {
              tags:
                ticketStatus == "Repaired & Collected"
                  ? ["Invoice Paid", ticketStatus]
                  : ["Invoice Paid"],
            },
            {
              headers: {
                Authorization: `Bearer ${new_access_token}`,
                Version: "2021-07-28",
              },
            }
          );
          console.log(
            `Invoice Paid Tag added in Highlevel's customer ${customerEmail}`,
            addTagRes.data
          );

          // Log success
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            businessName: client.business_name,
            eventType: "Success",
            event: "Invoice Paid in RepairDesk",
            platform: "RepairDesk",
            message: `${
              ticketStatus == "Repaired & Collected"
                ? `(Invoice Paid, ${ticketStatus}) Tags`
                : "Invoice Paid Tag"
            } added in Highlevel's customer <b>${
              customerEmail || customerPhone
            }</b>`,
            customData: addTagRes.data,
          });
        } catch (error) {
          console.error(error);

          // Log failure
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            businessName: client.business_name,
            eventType: "Failure",
            event: "Invoice Paid in RepairDesk",
            platform: "RepairDesk",
            message: `Error adding tag in Highlevel's Customer <b>${
              customerEmail || customerPhone
            }</b>`,
            customData: error.response ? error.response.data : error,
          });
        }
      }
    } else {
      console.log("Inovice is not paid yet");
    }
  } catch (error) {
    console.error(error.response);

    // Log Failure for General Error
    await ActivityLog.create({
      user_id: customerLocation.user_id,
      businessName: client.business_name,
      eventType: "Failure",
      message: error.response
        ? error.response.data.message
        : `Something went wrong! Maybe it is due to recieving incomplete request from RepairDesk`,
      event: "Invoice Paid in RepairDesk",
      platform: "RepairDesk",
      customData: error.response ? error.response.data : error,
    });
  }
  res.status(200).send("Webhook Recieved Successfully");

  console.log("/////*******************************************/////");
};

module.exports = {
  handleRepairDeskWebhook,
};
