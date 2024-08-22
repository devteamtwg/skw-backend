const Locationhl = require("../../models/locationhl");
const Client = require("../../models/client");
const { default: axios } = require("axios");

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

  const customerLocation = await Locationhl.findOne({
    serviceSubdomain: subdomain,
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
          Authorization: `Bearer ${customerLocation.hl_access_token}`,
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
              Authorization: `Bearer ${customerLocation.hl_access_token}`,
              Version: "2021-07-28",
            },
          }
        );
        console.log(
          "Syncro Customer Synced with Highlevel Successfully",
          highlevelCustomerRes.data
        );
      } catch (error) {
        console.error(error.response);
      }
    }
  } catch (error) {
    console.error(error.response);
  }

  res.status(200).send("Webhook received successfully");
};

// Ticket Status changed in Syncro
const handleTicketStatusChanged = async (req, res) => {
  // const date = new Date();
  // console.log(
  //   `Ticket Status Changed in Syncro at ${date.toLocaleTimeString()}`,
  //   req.body
  // );

  const syncroTicket = req.body;
  const { customer, status } = syncroTicket.attributes;

  const url = syncroTicket.link;
  const subdomain = url?.split(".")[0]?.replace("https://", "");

  const customerLocation = await Locationhl.findOne({
    serviceSubdomain: subdomain,
  });

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
          Authorization: `Bearer ${customerLocation.hl_access_token}`,
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
              Authorization: `Bearer ${customerLocation.hl_access_token}`,
              Version: "2021-07-28",
            },
          }
        );
        console.log(
          `Tag added in Highlevel's customer ${customer.firstName}`,
          addTagRes.data
        );
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

  const customerLocation = await Locationhl.findOne({
    serviceSubdomain: subdomain,
  });

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
          Authorization: `Bearer ${customerLocation.hl_access_token}`,
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
              Authorization: `Bearer ${customerLocation.hl_access_token}`,
              Version: "2021-07-28",
            },
          }
        );
        // console.log(addTagRes.data);
        console.log(
          `Tag added in Highlevel's customer ${customer.firstName}`,
          addTagRes.data
        );
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
