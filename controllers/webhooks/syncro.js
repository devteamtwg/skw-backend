const Locationhl = require("../../models/locationhl");
const Client = require("../../models/client");
const { default: axios } = require("axios");
const ActivityLog = require("../../models/activity");

// Customer Created in Syncro
const handleCustomerCreation = async (req, res) => {
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

  // Get Business
  const client = await Client.findOne({
    user_id: customerLocation.user_id,
  });

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

  try {
    const duplicateCustomerRes = await axios.get(
      `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${
        customerLocation.hl_location_id
      }&email=${encodeURIComponent(syncroCustomer.email)}`,
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
          "Syncro Customer Synced with Highlevel Successfully",
          highlevelCustomerRes.data
        );

        // Log success
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          eventType: "Success",
          message: `Syncro Customer Synced with Highlevel Successfully`,
          customData: highlevelCustomerRes.data,
        });
      } catch (error) {
        console.error(error.response);

        // Log failure
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          eventType: "Failure",
          message: `Error syncing Syncro customer in Highlevel`,
          customData: error.response ? error.response.data : error,
        });
      }
    }
  } catch (error) {
    console.error(error.response);
  }

  res.status(200).send("Webhook received successfully");
};

// Ticket Status changed in Syncro
const handleTicketStatusChanged = async (req, res) => {
  const date = new Date();
  console.log(
    `Ticket Status Changed in Syncro at ${date.toLocaleTimeString()}`,
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
          {
            field: "email",
            operator: "eq",
            value: customer.email,
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
          `${status} Tag added in Highlevel's customer ${customer.email}`,
          addTagRes.data
        );

        // Log success
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          eventType: "Success",
          message: `Tag added in Highlevel's customer ${customer.email}`,
          customData: addTagRes.data,
        });
      } catch (error) {
        console.error(error);

        // Log failure
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          eventType: "Failure",
          message: `Error adding tag in Highlevel's Customer ${customer.email}`,
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
      message: `Error adding tag in Highlevel's Customer ${customer.email}`,
      customData: error.response ? error.response.data : error,
    });
  }

  // Create a tag in Highlevel
  res.status(200).send("Webhook received successfully");
};

// Invoice is Paid in Syncro
const handleInvoicePaid = async (req, res) => {
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
          {
            field: "email",
            operator: "eq",
            value: customer.email,
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
            customer.email
          }`,
          addTagRes.data
        );

        // Log success
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          eventType: "Success",
          message: `${
            success && "Invoice Paid"
          } Tag added in Highlevel's customer ${customer.email}`,
          customData: addTagRes.data,
        });
      } catch (error) {
        console.error(error);

        // Log failure
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          eventType: "Failure",
          message: `Error adding tag in Highlevel's Customer ${customer.firstName}`,
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
      message: `Error adding tag in Highlevel's Customer ${customer.firstName}`,
      customData: error.response ? error.response.data : error,
    });
  }

  // Create a tag in Highlevel
  res.status(200).send("Webhook received successfully");
};

module.exports = {
  handleCustomerCreation,
  handleTicketStatusChanged,
  handleInvoicePaid,
};
