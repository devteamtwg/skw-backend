const { default: axios } = require("axios");
const Locationhl = require("../../models/locationhl");
const Client = require("../../models/client");
const ActivityLog = require("../../models/activity");

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

  if (!customerLocation) {
    res.status(404).send("Location not found!");
    return;
  }

  // console.log("customerLocation", customerLocation)

  // Create customer in Syncro/RepairShopr
  const payload = {
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
    customerLocation.serviceUsing == "Syncro" ||
    customerLocation.serviceUsing == "RepairShopr"
  ) {
    try {
      const duplicateCustomerRes = await axios.get(
        `https://${customerLocation.serviceSubdomain}.${
          customerLocation.serviceUsing == "Syncro"
            ? "syncromsp"
            : "repairshopr"
        }.com/api/v1/customers/autocomplete?query=${highlevelCustomer.email}`,
        {
          headers: {
            Authorization: customerLocation.serviceApiKey,
          },
        }
      );
      console.log("duplicateCustomerRes", duplicateCustomerRes.data.customers);

      if (duplicateCustomerRes.data.customers.length == 0) {
        try {
          const res = await axios.post(
            `https://${customerLocation.serviceSubdomain}.${
              customerLocation.serviceUsing == "Syncro"
                ? "syncromsp"
                : "repairshopr"
            }.com/api/v1/customers`,
            payload,
            {
              headers: {
                Authorization: customerLocation.serviceApiKey,
              },
            }
          );
          console.log(
            `customer synced with ${customerLocation.serviceUsing} successfully`
          );
          console.log(res.data);
          // Log success
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            eventType: "Success",
            message: `Customer synced with ${customerLocation.serviceUsing} successfully`,
            customData: res.data,
          });
        } catch (error) {
          console.log(
            `error creating customer in ${customerLocation.serviceUsing}`,
            error
          );

          // Log failure
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            eventType: "Failure",
            message: `Error creating customer in ${customerLocation.serviceUsing}: ${error.message}`,
            customData: error.response ? error.response.data : {},
          });
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  // Create customer in RepairDesk
  else if (customerLocation.serviceUsing == "RepairDesk") {
    const formattedEmail =
      highlevelCustomer?.email?.replace("+", "") || highlevelCustomer.email;
    try {
      const findCustomerRes = await axios.get(
        `https://api.repairdesk.co/api/web/v1/customers?api_key=${customerLocation.serviceApiKey}&keyword=${formattedEmail}`
      );
      // console.log("findCustomerRes", findCustomerRes.data.data.customerData);
      if (findCustomerRes.data.data.customerData.length === 0) {
        const createCustomerRes = await axios.post(
          `https://api.repairdesk.co/api/web/v1/customers?api_key=${customerLocation.serviceApiKey}`,
          {
            first_name: payload.firstname,
            last_name: payload.lastname,
            phone: payload.phone,
            address1: payload.address,
            email: payload.email,
          }
        );
        console.log(
          "customer created in RepairDesk Successfully"
          // createCustomerRes.data
        );

        if (createCustomerRes.data.success) {
          // Log success
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            eventType: "Success",
            message: `Customer synced with ${customerLocation.serviceUsing} successfully`,
            customData: createCustomerRes.data,
          });
        } else {
          throw createCustomerRes.data;
        }
      }
    } catch (error) {
      console.log(error);

      // Log failure
      await ActivityLog.create({
        eventType: "Failure",
        message: `Error creating customer in ${customerLocation.serviceUsing}: ${error.message}`,
        customData: error,
      });
    }
  }
  res.status(200).send("Webhook received successfully");
};

// Appointment Booked in Highlevel
const handleAppointmentBooked = async (req, res) => {
  const date = new Date();
  console.log(
    `Appointment Booked in Highlevel at ${date.toLocaleTimeString()}:`,
    req.body
  );

  const bookedAppointment = req.body;

  const customerLocation = await Locationhl.findOne({
    hl_location_id: bookedAppointment.location.id,
  });

  if (!customerLocation) {
    res.status(404).send("Location not found!");
    return;
  }

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
    customerLocation.serviceUsing == "Syncro" ||
    customerLocation.serviceUsing == "RepairShopr"
  ) {
    // Create Lead in Syncro/RepairShopr
    try {
      const res = await axios.post(
        `https://${customerLocation.serviceSubdomain}.${
          customerLocation.serviceUsing == "Syncro"
            ? "syncromsp"
            : "repairshopr"
        }.com/api/v1/leads`,
        payload,
        {
          headers: {
            Authorization: customerLocation.serviceApiKey,
          },
        }
      );
      console.log(`lead created in ${customerLocation.serviceUsing}`, res.data);

      // Log success
      await ActivityLog.create({
        user_id: customerLocation.user_id,
        eventType: "Success",
        message: `Lead created in ${customerLocation.serviceUsing} successfully`,
        customData: res.data,
      });
    } catch (error) {
      console.log(error.response);
      // Log failure
      await ActivityLog.create({
        user_id: customerLocation.user_id,
        eventType: "Failure",
        message: `Error creating lead in ${customerLocation.serviceUsing}: ${error.response.data.message}`,
        customData: error.response ? error.response.data : {},
      });
    }
  }

  // Create lead in RepairDesk
  else if (customerLocation.serviceUsing == "RepairDesk") {
    try {
      const res = await axios.post(
        `https://api.repairdesk.co/api/web/v1/appointment/create?api_key=${customerLocation.serviceApiKey}`,
        {
          summary: {
            firstName: payload.first_name,
            lastName: payload.last_name,
            email: payload.email,
            mobile: payload.phone,
            address: payload.address,
          },
          devices: [],
        },
        {
          headers: {
            Authorization: customerLocation.serviceApiKey,
          },
        }
      );
      console.log(`lead created in ${customerLocation.serviceUsing}`, res.data);

      if (res.data.success) {
        // Log success
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          eventType: "Success",
          message: `Lead created in ${customerLocation.serviceUsing} successfully`,
          customData: res.data,
        });
      } else {
        throw createCustomerRes.data;
      }
    } catch (error) {
      console.log(error);
      // Log failure
      await ActivityLog.create({
        eventType: "Failure",
        message: `Error creating lead in ${customerLocation.serviceUsing}: ${error.message}`,
        customData: error,
      });
    }
  }

  res.status(200).send("Webhook received successfully");
};

module.exports = {
  handleCustomerCreation,
  handleAppointmentBooked,
};
