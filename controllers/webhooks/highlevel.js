const { default: axios } = require("axios");
const Locationhl = require("../../models/locationhl");
const Client = require("../../models/client");

// Customer Created in Highlevel
const handleCustomerCreation = async (req, res) => {
  // const date = new Date();
  // console.log(
  //   `Customer Created in Highlevel at ${date.toLocaleTimeString()}`,
  //   req.body
  // );
  const highlevelCustomer = req.body;

  const customerLocation = await Locationhl.findOne({
    hl_location_id: highlevelCustomer.location.id,
  });

  const business = await Client.findOne({
    user_id: customerLocation.user_id,
  });

  // Create customer in Syncro
  const payload = {
    hl_customer_id: highlevelCustomer.contact_id, // Custom Field
    business_name: "",
    firstname: highlevelCustomer.first_name,
    lastname: highlevelCustomer.last_name,
    email: highlevelCustomer.email,
    phone: highlevelCustomer.phone,
    mobile: highlevelCustomer.mobile
      ? highlevelCustomer.mobile
      : highlevelCustomer.phone,
    address: highlevelCustomer.full_address,
    // city: "string",
    // state: "string",
    // zip: "string",
  };

  // console.log(payload);

  // Check Syncro/RepairShopr if user already exists
  if (
    business.serviceUsing == "Syncro" ||
    business.serviceUsing == "RepairShopr"
  ) {
    try {
      const syncroCustomerRes = await axios.get(
        `https://${business.serviceSubdomain}.${
          business.serviceUsing == "Syncro" ? "syncromsp" : "repairshopr"
        }.com/api/v1/customers/autocomplete?query=${highlevelCustomer.email}`,
        {
          headers: {
            Authorization: business.serviceApiKey,
          },
        }
      );
      console.log("syncroCustomerRes", syncroCustomerRes.data.customers);

      if (syncroCustomerRes.data.customers.length == 0) {
        try {
          const res = await axios.post(
            `https://${business.serviceSubdomain}.${
              business.serviceUsing == "Syncro" ? "syncromsp" : "repairshopr"
            }.com/api/v1/customers`,
            payload,
            {
              headers: {
                Authorization: business.serviceApiKey,
              },
            }
          );
          console.log(
            `customer synced with ${business.serviceUsing} successfully`
          );
          // console.log(res.data);
        } catch (error) {
          console.log(error.response.data);
        }
      }
    } catch (error) {
      console.log(error.response.data);
    }
  }
  res.status(200).send("Webhook received successfully");
};

// Appointment Booked in Highlevel
const handleAppointmentBooked = async (req, res) => {
  // const date = new Date();
  // console.log(
  //   `Appointment Booked in Highlevel at ${date.toLocaleTimeString()}:`,
  //   req.body
  // );

  const bookedAppointment = req.body;

  const customerLocation = await Locationhl.findOne({
    hl_location_id: bookedAppointment.location.id,
  });

  const business = await Client.findOne({
    user_id: customerLocation.user_id,
  });

  const payload = {
    address: bookedAppointment.full_address,
    // business_name: "",
    email: bookedAppointment.email,
    first_name: bookedAppointment.first_name,
    last_name: bookedAppointment.last_name,
    phone: bookedAppointment.phone,
    appointment_type_id: 0,
  };

  if (
    business.serviceUsing == "Syncro" ||
    business.serviceUsing == "RepairShopr"
  ) {
    // Create Lead in Syncro/RepairShopr
    try {
      const res = await axios.post(
        `https://${business.serviceSubdomain}.${
          business.serviceUsing == "Syncro" ? "syncromsp" : "repairshopr"
        }.com/api/v1/leads`,
        payload,
        {
          headers: {
            Authorization: business.serviceApiKey,
          },
        }
      );
      console.log(`lead created in ${business.serviceUsing}`, res.data);
    } catch (error) {
      console.log(error.response);
    }
  }

  res.status(200).send("Webhook received successfully");
};

module.exports = {
  handleCustomerCreation,
  handleAppointmentBooked,
};
