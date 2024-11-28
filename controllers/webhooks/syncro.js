const Locationhl = require("../../models/locationhl");
const Client = require("../../models/client");
const { default: axios } = require("axios");
const ActivityLog = require("../../models/activity");

// Customer Created in Syncro
const handleCustomerCreation = async (req, res) => {
  console.log("/////*******************************************/////");
  const date = new Date();
  console.log(
    `Customer Created in Syncro at ${date.toLocaleTimeString()}`,
    req.body
  );

  const syncroCustomer = req.body;

  const url = syncroCustomer.link;
  const subdomain = url?.split(".")[0]?.replace("https://", "");

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

  const payload = {
    email: syncroCustomer.attributes.email,
    phone: syncroCustomer.attributes.phone,
    firstName: syncroCustomer.attributes.firstname,
    lastName: syncroCustomer.attributes.lastname,
    name: syncroCustomer.attributes.fullname,
    address1: syncroCustomer.attributes.address,
    city: syncroCustomer.attributes.city,
    state: syncroCustomer.attributes.state,
    country: syncroCustomer.attributes.country,
    locationId: customerLocation.hl_location_id,
  };

  // console.log("payload", payload);

  const phoneNumber = payload.phone?.replace(/[\s-]+/g, "");
  const formattedPhoneNumber =
    phoneNumber && !phoneNumber.startsWith("+")
      ? `+1${phoneNumber}` // Add country code if missing
      : phoneNumber;

  try {
    let duplicateCustomerRes =
      payload.email &&
      (await axios.get(
        `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${
          customerLocation.hl_location_id
        }&email=${encodeURIComponent(payload.email)}`,
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
          }&number=${encodeURIComponent(formattedPhoneNumber)}`,
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
          "Syncro Customer Synced with Existing Highlevel Customer Successfully",
          updateHighlevelCustomerRes.data
        );

        // Log success
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          businessName: client.business_name,
          eventType: "Success",
          event: "Customer Created in Syncro",
          platform: "Syncro",
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
          event: "Customer Created in Syncro",
          platform: "Syncro",
          message: `Error syncing Syncro customer with Existing Highlevel Customer ${
            error.response ? error.response.data.message : ""
          }`,
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
          "Syncro Customer Synced in Highlevel Successfully",
          highlevelCustomerRes.data
        );

        // Log success
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          businessName: client.business_name,
          eventType: "Success",
          event: "Customer Created in Syncro",
          platform: "Syncro",
          message: `Customer <b>${
            payload.email || payload.phone
          }</b> Synced in Highlevel Successfully`,
          customData: highlevelCustomerRes.data,
        });
      } catch (error) {
        console.error(error.response);

        // Log failure
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          businessName: client.business_name,
          eventType: "Failure",
          event: "Customer Created in Syncro",
          platform: "Syncro",
          message: `Error syncing Syncro customer in Highlevel`,
          customData: error.response ? error.response.data : error,
        });
      }
    }
  } catch (error) {
    console.error(error.response);
  }

  res.status(200).send("Webhook received successfully");
  console.log("/////*******************************************/////");
};

// Ticket Created in Syncro
const handleTicketCreated = async (req, res) => {
  console.log("/////*******************************************/////");
  const date = new Date();
  console.log(
    `Ticket Created in Syncro at ${date.toLocaleTimeString()}`,
    req.body
  );

  const syncroTicket = req.body;
  const { customer, status } = syncroTicket.attributes;

  const url = syncroTicket.link;
  const subdomain = url?.split(".")[0]?.replace("https://", "");

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

  let maxAttempts = 3;
  let retryDelay = 1500;

  const findCustomerAndTagThem = async () => {
    try {
      const phoneNumber =
        customer?.phone?.replace(/[\s-]+/g, "") ||
        customer?.mobile?.replace(/[\s-]+/g, "");
      const formattedPhoneNumber =
        phoneNumber && !phoneNumber.startsWith("+")
          ? `+1${phoneNumber}` // Add country code if missing
          : phoneNumber;

      const highlevelCustomerRes = await axios.post(
        "https://services.leadconnectorhq.com/contacts/search",
        {
          locationId: customerLocation.hl_location_id,
          page: 1,
          pageLimit: 20,
          filters: [
            customer.email
              ? {
                  field: "email",
                  operator: "eq",
                  value: customer.email,
                }
              : {
                  field: "phone",
                  operator: "eq",
                  value: formattedPhoneNumber || "",
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

      // Add a tag in HighLevel's Customer
      if (searchedCustomers.length > 0) {
        try {
          const addTagRes = await axios.post(
            `https://services.leadconnectorhq.com/contacts/${searchedCustomers[0].id}/tags`,
            {
              tags: [status],
            },
            {
              headers: {
                Authorization: `Bearer ${new_access_token}`,
                Version: "2021-07-28",
              },
            }
          );
          console.log(
            `${status} Tag added in HighLevel's customer ${
              customer.email || formattedPhoneNumber
            }`,
            addTagRes.data
          );

          // Log success
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            businessName: client.business_name,
            eventType: "Success",
            event: "Ticket and Customer Created in Syncro",
            platform: "Syncro",
            message: `${status} Tag added in HighLevel's customer <b>${
              customer.email || formattedPhoneNumber
            }</b>`,
            customData: addTagRes.data,
          });

          return true; // Indicate success
        } catch (error) {
          console.error(error);

          // Log failure
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            businessName: client.business_name,
            eventType: "Failure",
            event: "Ticket and Customer Created in Syncro",
            platform: "Syncro",
            message: `Error adding tag in HighLevel's Customer`,
            customData: error.response ? error.response.data : error,
          });
        }
      }
    } catch (error) {
      console.error(error.response);
    }

    return false; // Indicate failure
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const success = await findCustomerAndTagThem();

    if (success) {
      break; // Exit the loop if the tag was successfully added
    }

    // Wait before the next attempt
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    if (!success && attempt == maxAttempts) {
      // Log failure
      await ActivityLog.create({
        user_id: customerLocation.user_id,
        businessName: client.business_name,
        eventType: "Failure",
        event: "Ticket Status Changed in Syncro",
        platform: "Syncro",
        message: `Customer not found in 3 Attempts`,
        customData: null,
      });
    }
  }

  res.status(200).send("Webhook received successfully");
  console.log("/////*******************************************/////");
};

// Ticket Status changed in Syncro
const handleTicketStatusChanged = async (req, res) => {
  console.log("/////*******************************************/////");
  const date = new Date();
  console.log(
    `Ticket Status Changed in Syncro at ${date.toLocaleTimeString()}`,
    req.body
  );

  const syncroTicket = req.body;
  const { customer, status } = syncroTicket?.attributes;

  const url = syncroTicket.link;
  const subdomain = url?.split(".")[0]?.replace("https://", "");

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

  try {
    const phoneNumber =
      customer?.phone?.replace(/[\s-]+/g, "") ||
      customer?.mobile?.replace(/[\s-]+/g, "");
    const formattedPhoneNumber =
      phoneNumber && !phoneNumber.startsWith("+")
        ? `+1${phoneNumber}` // Add country code if missing
        : phoneNumber;

    const highlevelCustomerRes = await axios.post(
      "https://services.leadconnectorhq.com/contacts/search",
      {
        locationId: customerLocation.hl_location_id,
        page: 1,
        pageLimit: 20,
        filters: [
          customer.email
            ? {
                field: "email",
                operator: "eq",
                value: customer.email,
              }
            : {
                field: "phone",
                operator: "eq",
                value: formattedPhoneNumber || "",
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
            tags: [status],
          },
          {
            headers: {
              Authorization: `Bearer ${new_access_token}`,
              Version: "2021-07-28",
            },
          }
        );
        console.log(
          `${status} Tag added in Highlevel's customer ${
            customer.email || customer.phone || customer.mobile
          }`,
          addTagRes.data
        );

        // Log success
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          businessName: client.business_name,
          eventType: "Success",
          event: "Ticket Status Changed in Syncro",
          platform: "Syncro",
          message: `Tag added in Highlevel's customer <b>${
            customer.email || customer.phone || customer.mobile
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
          event: "Ticket Status Changed in Syncro",
          platform: "Syncro",
          message: `Error adding tag in Highlevel's Customer`,
          customData: error.response ? error.response.data : error,
        });
      }
    }
  } catch (error) {
    console.error(error.response);

    // Log failure
    await ActivityLog.create({
      user_id: customerLocation.user_id,
      businessName: client.business_name,
      eventType: "Failure",
      event: "Ticket Status Changed in Syncro",
      platform: "Syncro",
      message: `Error adding tag in Highlevel's Customer`,
      customData: error.response ? error.response.data : error,
    });
  }
  res.status(200).send("Webhook received successfully");
  console.log("/////*******************************************/////");
};

// Invoice is Paid in Syncro
const handleInvoicePaid = async (req, res) => {
  console.log("/////*******************************************/////");
  // const date = new Date();
  // console.log(
  //   `An Invoice is Paid in Syncro at ${date.toLocaleTimeString()}`,
  //   req.body
  // );

  const syncroInvoice = req.body;
  const { customer, success } = syncroInvoice.attributes;

  const url = syncroInvoice.link;
  const subdomain = url?.split(".")[0]?.replace("https://", "");

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

  try {
    const highlevelCustomerRes = await axios.post(
      "https://services.leadconnectorhq.com/contacts/search",
      {
        locationId: customerLocation.hl_location_id,
        page: 1,
        pageLimit: 20,
        filters: [
          customer.email
            ? {
                field: "email",
                operator: "eq",
                value: customer.email,
              }
            : {
                field: "phone",
                operator: "eq",
                value:
                  customer?.phone?.replace(/[\s-]+/g, "") ||
                  customer?.mobile?.replace(/[\s-]+/g, "") ||
                  "",
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

    const searchedCustomers = highlevelCustomerRes.data.contacts;

    // Add a tag in Highlevel's Customer
    if (searchedCustomers.length > 0) {
      try {
        const addTagRes = await axios.post(
          `https://services.leadconnectorhq.com/contacts/${searchedCustomers[0].id}/tags`,
          {
            tags: [success && "Invoice Paid"],
          },
          {
            headers: {
              Authorization: `Bearer ${new_access_token}`,
              Version: "2021-07-28",
            },
          }
        );
        // console.log(addTagRes.data);
        console.log(
          `${success && "Invoice Paid"} Tag added in Highlevel's customer ${
            customer.email || customer.phone || customer.mobile
          }`,
          addTagRes.data
        );

        // Log success
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          businessName: client.business_name,
          eventType: "Success",
          event: "Invoice Paid in Syncro",
          platform: "Syncro",
          message: `${
            success && "Invoice Paid"
          } Tag added in Highlevel's customer <b>${
            customer.email || customer.phone || customer.mobile
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
          event: "Invoice Paid in Syncro",
          platform: "Syncro",
          message: `Error adding tag in Highlevel's Customer`,
          customData: error.response ? error.response.data : error,
        });
      }
    }
  } catch (error) {
    console.error(error.response);

    // Log failure
    await ActivityLog.create({
      user_id: customerLocation.user_id,
      businessName: client.business_name,
      eventType: "Failure",
      event: "Invoice Paid in Syncro",
      platform: "Syncro",
      message: `Error adding tag in Highlevel's Customer`,
      customData: error.response ? error.response.data : error,
    });
  }

  // Create a tag in Highlevel
  res.status(200).send("Webhook received successfully");
  console.log("/////*******************************************/////");
};

module.exports = {
  handleCustomerCreation,
  handleTicketCreated,
  handleTicketStatusChanged,
  handleInvoicePaid,
};
