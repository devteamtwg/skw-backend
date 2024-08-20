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

  // const customerLocation = await Locationhl.findOne({
  //   hl_location_id: syncroCustomer.location.id,
  // });

  // const business = await Client.findOne({
  //   user_id: customerLocation.user_id,
  // });

  const payload = {
    email: syncroCustomer.email,
    phone: syncroCustomer.phone,
    firstName: syncroCustomer.firstname,
    lastName: syncroCustomer.lastname,
    name: syncroCustomer.fullname,
    address1: syncroCustomer.address,
    city: syncroCustomer.city,
    state: syncroCustomer.state,
    country: syncroCustomer.country,
    companyName: syncroCustomer.business_name,
    tags: ["commodo", "veniam ut reprehenderit"],
  };

  // console.log("payload", payload);

  // try {
  //   const highlevelCustomerRes = await axios.post(
  //     "https://services.leadconnectorhq.com/contacts/search",
  //     { email: syncroCustomer.email },
  //     {
  //       headers: {
  //         Authorization: "" // Highlevel Access Token,
  //       }
  //     }
  //   );
  //   console.log("highlevelCustomerRes", highlevelCustomerRes.data);
  // } catch (error) {
  //   console.log(error.response);
  // }

  res.status(200).send("Webhook received successfully");
};

// Ticket Stats changed in Syncro
const handleTicketStatusChanged = async (req, res) => {
  const date = new Date();
  console.log(
    `Ticket Status Changed in Syncro at ${date.toLocaleTimeString()}`,
    req.body
  );

  const syncroTicket = req.body;

  // Create a tag in Highlevel
  res.status(200).send("Webhook received successfully");
};

// Invoice is Paid in Syncro
const handleInvoicePaid = async (req, res) => {
  const date = new Date();
  console.log(
    `An Invoice is Paid in Syncro at ${date.toLocaleTimeString()}`,
    req.body
  );

  const syncroInvoice = req.body;

  // Create a tag in Highlevel
  res.status(200).send("Webhook received successfully");
};

module.exports = {
  handleCustomerCreation,
  handleTicketStatusChanged,
  handleInvoicePaid,
};
