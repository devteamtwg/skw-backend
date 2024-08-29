const Locationhl = require("../../models/locationhl");
const Client = require("../../models/client");
const { default: axios } = require("axios");

// Customer Created in RepairShopr
const handleCustomerCreation = async (req, res) => {
  // const date = new Date();
  // console.log(
  //   `Customer Created in RepairShopr at ${date.toLocaleTimeString()}`,
  //   req.body
  // );

  const repairShoprCustomer = req.body;

  const url = repairShoprCustomer.link;
  const subdomain = url.split(".")[0].replace("https://", "");

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

  const payload = {
    email: repairShoprCustomer.attributes.email,
    phone: repairShoprCustomer.attributes.phone,
    firstName: repairShoprCustomer.attributes.firstname,
    lastName: repairShoprCustomer.attributes.lastname,
    name: repairShoprCustomer.attributes.fullname,
    address1: repairShoprCustomer.attributes.address,
    city: repairShoprCustomer.attributes.city,
    state: repairShoprCustomer.attributes.state,
    country: repairShoprCustomer.attributes.country,
    locationId: customerLocation.hl_location_id,
  };

  // console.log("payload", payload);

  try {
    const duplicateCustomerRes = await axios.get(
      `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${
        customerLocation.hl_location_id
      }&email=${encodeURIComponent(repairShoprCustomer.email)}`,
      {
        headers: {
          Authorization: `Bearer ${new_access_token}`,
          Version: "2021-07-28",
        },
      }
    );
    // console.log("duplicateCustomerRes", duplicateCustomerRes.data);

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
        // console.log("highlevelCustomerRes", highlevelCustomerRes.data);
        console.log("RepairShopr Customer Synced with Highlevel Successfully");
      } catch (error) {
        console.error(error.response);
      }
    }
  } catch (error) {
    console.error(error.response);
  }

  res.status(200).send("Webhook received successfully");
};

// Ticket Status changed in RepairShopr
const handleTicketStatusChanged = async (req, res) => {
  // const date = new Date();
  // console.log(
  //   `Ticket Status Changed in RepairShopr at ${date.toLocaleTimeString()}`,
  //   req.body
  // );

  const repairShoprTicket = req.body;
  const { customer, status } = repairShoprTicket.attributes;

  const url = repairShoprTicket.link;
  const subdomain = url.split(".")[0].replace("https://", "");

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
        // console.log(addTagRes.data);
      } catch (error) {
        console.error(error);
      }
    }
  } catch (error) {
    console.error(error.response);
  }

  // Create a tag in Highlevel
  res.status(200).send("Webhook received successfully");
};

// Invoice is Paid in RepairShopr
const handleInvoicePaid = async (req, res) => {
  // const date = new Date();
  // console.log(
  //   `An Invoice is Paid in RepairShopr at ${date.toLocaleTimeString()}`,
  //   req.body
  // );

  const repairShoprInvoice = req.body;
  const { customer, success } = repairShoprInvoice.attributes;

  const url = repairShoprInvoice.link;
  const subdomain = url.split(".")[0].replace("https://", "");

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
      } catch (error) {
        console.error(error);
      }
    }
  } catch (error) {
    console.error(error.response);
  }

  // Create a tag in Highlevel
  res.status(200).send("Webhook received successfully");
};

module.exports = {
  handleCustomerCreation,
  handleTicketStatusChanged,
  handleInvoicePaid,
};
