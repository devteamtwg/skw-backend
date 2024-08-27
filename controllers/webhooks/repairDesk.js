const Locationhl = require("../../models/locationhl");
const Client = require("../../models/client");
const { default: axios } = require("axios");
const ActivityLog = require("../../models/activity");

// Customer Created in RepairDesk
const handleCustomerCreation = async (req, res) => {
  const date = new Date();
  console.log(
    `Customer Created in RepairDesk at ${date.toLocaleTimeString()}`,
    req.body
  )

  const repairDeskCustomer = req.body;

  const url = repairDeskCustomer.link;
  const subdomain = url.split(".")[0].replace("https://", "");

  const customerLocation = await Locationhl.findOne({
    serviceSubdomain: subdomain,
  });

  const payload = {
    email: repairDeskCustomer.attributes.email,
    phone: repairDeskCustomer.attributes.phone,
    firstName: repairDeskCustomer.attributes.firstname,
    lastName: repairDeskCustomer.attributes.lastname,
    name: repairDeskCustomer.attributes.fullname,
    address1: repairDeskCustomer.attributes.address,
    city: repairDeskCustomer.attributes.city,
    state: repairDeskCustomer.attributes.state,
    country: repairDeskCustomer.attributes.country,
    locationId: customerLocation.hl_location_id,
  };

  // console.log("payload", payload);

  try {
    const duplicateCustomerRes = await axios.get(
      `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${
        customerLocation.hl_location_id
      }&email=${encodeURIComponent(repairDesk.email)}`,
      {
        headers: {
          Authorization: `Bearer ${customerLocation.hl_access_token}`,
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
              Authorization: `Bearer ${customerLocation.hl_access_token}`,
              Version: "2021-07-28",
            },
          }
        );
        // console.log("highlevelCustomerRes", highlevelCustomerRes.data);
        console.log("RepairDesk Customer Synced with Highlevel Successfully");

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

  res.status(200).send("Webhook received successfully");
};

// Ticket Status changed in RepairDesk
const handleTicketStatusChanged = async (req, res) => {
  const date = new Date();
  console.log(
    `Ticket Status Changed in RepairDesk at ${date.toLocaleTimeString()}`,
    req.body
  );

  const repairDeskTicket = req.body;
  const { customer, status } = repairDeskTicket.attributes;

  const url = repairDeskTicket.link;
  const subdomain = url.split(".")[0].replace("https://", "");

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
          `${status} Tag added in Highlevel's customer ${customer.email}`
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

// Invoice is Paid in RepairDesk
const handleInvoicePaid = async (req, res) => {
  const date = new Date();
  console.log(
    `An Invoice is Paid in RepairDesk at ${date.toLocaleTimeString()}`,
    req.body
  );

  const repairDeskInvoice = req.body;
  const { customer, success } = repairDeskInvoice.attributes;

  const url = repairDeskInvoice.link;
  const subdomain = url.split(".")[0].replace("https://", "");

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
