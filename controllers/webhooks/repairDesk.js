const Locationhl = require("../../models/locationhl");
const Client = require("../../models/client");
const { default: axios } = require("axios");
const ActivityLog = require("../../models/activity");

// Unified Webhook Handler
const handleRepairDeskWebhook = async (req, res) => {
  const date = new Date();
  const text = req.body.text;
  console.log(`Webhook received at ${date.toLocaleTimeString()}`, text);

  try {
    switch (true) {
      case /Added New Customer/.test(text):
        await handleCustomerCreation(req, res, text);
        break;
      case /Updated ticket Status/.test(text):
        await handleTicketStatusChanged(req, res, text);
        break;
      case /Updated Invoice/.test(text):
        await handleInvoicePaid(req, res, text);
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

const handleCustomerCreation = async (req, res, text) => {
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
    const payload = {
      email: getCustomerRes.data.data.emails[0].value,
      phone: getCustomerRes.data.data.phone || getCustomerRes.data.data.mobile,
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
      const duplicateCustomerRes = await axios.get(
        `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${
          customerLocation.hl_location_id
        }&email=${encodeURIComponent(payload.email)}`,
        {
          headers: {
            Authorization: `Bearer ${new_access_token}`,
            Version: "2021-07-28",
          },
        }
      );
      console.log("duplicateCustomerRes", duplicateCustomerRes.data);

      if (duplicateCustomerRes.data.contact == null) {
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
            eventType: "Success",
            message: `RepairDesk Customer Synced with Highlevel Successfully`,
            customData: highlevelCustomerRes.data,
          });
        } catch (error) {
          console.error(error.response);

          // Log failure
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            eventType: "Failure",
            message: `Error syncing RepairDesk customer in Highlevel`,
            customData: error.response ? error.response.data : error,
          });
        }
      }
    } catch (error) {
      console.error(error.response);
    }
  } catch (error) {
    console.error(error);
  }
};

const handleTicketStatusChanged = async (req, res, text) => {
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

    const getCustomerRes = await axios.get(
      `https://api.repairdesk.co/api/web/v1/customers/${getTicketRes.data.data.summary.customer.cid}?api_key=${customerLocation.serviceApiKey}`
    );
    console.log("getCustomerRes", getCustomerRes.data.data);

    const highlevelCustomerRes = await axios.post(
      "https://services.leadconnectorhq.com/contacts/search",
      {
        locationId: customerLocation.hl_location_id,
        page: 1,
        pageLimit: 20,
        filters: [
          {
            field: "email",
            operator: "eq",
            value: getCustomerRes.data.data.emails[0].value,
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
          `${statusTo} Tag added in Highlevel's customer ${getCustomerRes.data.data.emails[0].value}`,
          addTagRes.data
        );

        // Log success
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          eventType: "Success",
          message: `Tag added in Highlevel's customer ${getCustomerRes.data.data.emails[0].value}`,
          customData: addTagRes.data,
        });
      } catch (error) {
        console.error(error);

        // Log failure
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          eventType: "Failure",
          message: `Error adding tag in Highlevel's Customer ${getCustomerRes.email}`,
          customData: error.response ? error.response.data : error,
        });
      }
    }
  } catch (error) {
    console.error(error.response);

    // Log failure
    await ActivityLog.create({
      user_id: customerLocation.user_id,
      eventType: "Failure",
      message: `Error adding tag in Highlevel's Customer ${getCustomerRes.email}`,
      customData: error.response ? error.response.data : error,
    });
  }
};

const handleInvoicePaid = async (req, res, text) => {
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

    const getCustomerRes = await axios.get(
      `https://api.repairdesk.co/api/web/v1/customers/${getInvoiceRes.data.data.summary.customer.cid}?api_key=${customerLocation.serviceApiKey}`
    );
    console.log("getCustomerRes", getCustomerRes.data.data);

    if (getInvoiceRes.data.data.summary.status.toLowerCase() == "paid") {
      console.log("Inovice is paid now");
      const highlevelCustomerRes = await axios.post(
        "https://services.leadconnectorhq.com/contacts/search",
        {
          locationId: customerLocation.hl_location_id,
          page: 1,
          pageLimit: 20,
          filters: [
            {
              field: "email",
              operator: "eq",
              value: getCustomerRes.data.data.emails[0].value,
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
            `Invoice Tag added in Highlevel's customer ${getCustomerRes.email}`,
            addTagRes.data
          );

          // Log success
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            eventType: "Success",
            message: `Tag added in Highlevel's customer ${getCustomerRes.email}`,
            customData: addTagRes.data,
          });
        } catch (error) {
          console.error(error);

          // Log failure
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            eventType: "Failure",
            message: `Error adding tag in Highlevel's Customer ${getCustomerRes.email}`,
            customData: error.response ? error.response.data : error,
          });
        }
      }
    } else {
      console.log("Inovice is not paid yet");
    }
    res.status(200).send("Webhook Recieved Successfully");
  } catch (error) {
    console.error(error.response);

    // Log failure
    await ActivityLog.create({
      user_id: customerLocation.user_id,
      eventType: "Failure",
      message: `Internal Server Error`,
      customData: error.response ? error.response.data : error,
    });
  }
};

module.exports = {
  handleRepairDeskWebhook,
};
