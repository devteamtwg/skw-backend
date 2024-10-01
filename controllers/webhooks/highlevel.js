const { default: axios } = require("axios");
const Locationhl = require("../../models/locationhl");
const Client = require("../../models/client");
const ActivityLog = require("../../models/activity");

// Customer Created in Highlevel
const handleCustomerCreation = async (req, res) => {
  console.log("/////*******************************************/////");
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

  const client = await Client.findOne({
    user_id: customerLocation.user_id,
  });

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

  // If service is RepairDesk
  else if (customerLocation.serviceUsing == "RepairDesk") {
    // Check if customer already exists in RepairDesk
    try {
      let findCustomerRes =
        highlevelCustomer.email &&
        (await axios.get(
          `https://api.repairdesk.co/api/web/v1/customers?api_key=${customerLocation.serviceApiKey}&keyword=${highlevelCustomer.email}`
        ));

      if (
        findCustomerRes == undefined ||
        findCustomerRes?.data?.data?.customerData?.length == 0
      ) {
        if (highlevelCustomer.phone || highlevelCustomer.mobile) {
          findCustomerRes = await axios.get(
            `https://api.repairdesk.co/api/web/v1/customers?api_key=${
              customerLocation.serviceApiKey
            }&keyword=${highlevelCustomer.phone || highlevelCustomer.mobile}`
          );
        }
      }

      console.log("findCustomerRes", findCustomerRes?.data?.data);

      if (
        findCustomerRes &&
        findCustomerRes.data.data &&
        findCustomerRes.data.data.customerData.length > 0
      ) {
        const updateCustomerRes = await axios.put(
          `https://api.repairdesk.co/api/web/v1/customers/${findCustomerRes.data.data.customerData[0].cid}?api_key=${customerLocation.serviceApiKey}`,
          {
            first_name: payload.firstname,
            last_name: payload.lastname,
            phone: payload.phone,
            address1: payload.address,
            email: payload.email,
          }
        );

        console.log(
          `Existing Customer updated in ${customerLocation.serviceUsing} successfully`,
          updateCustomerRes.data
        );

        if (updateCustomerRes.data.success) {
          // Log success
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            businessName: client.business_name,
            platform: "Highlevel",
            event: "Customer created in Highlevel",
            eventType: "Success",
            message: `Existing Customer <b>${
              updateCustomerRes.data.data.email ||
              updateCustomerRes.data.data.phone ||
              updateCustomerRes.data.data.mobile
            }</b> updated in ${customerLocation.serviceUsing} successfully`,
            customData: updateCustomerRes.data,
          });
        } else if (updateCustomerRes.data.statusCode == 409) {
          return;
        } else {
          throw updateCustomerRes.data;
        }
      }
      // Create customer if not exists
      else {
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
          `Customer synced with ${customerLocation.serviceUsing} successfully`,
          createCustomerRes.data
        );

        if (createCustomerRes.data.success) {
          // Log success
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            businessName: client.business_name,
            platform: "Highlevel",
            event: "Customer created in Highlevel",
            eventType: "Success",
            message: `Customer <b>${
              createCustomerRes.data.data.email ||
              createCustomerRes.data.data.phone ||
              createCustomerRes.data.data.mobile
            }</b> synced with ${customerLocation.serviceUsing} successfully`,
            customData: createCustomerRes.data,
          });
        } else if (createCustomerRes.data.statusCode == 409) {
          return;
        } else {
          throw createCustomerRes.data;
        }
      }
    } catch (error) {
      console.log(error);

      // Log failure
      await ActivityLog.create({
        user_id: customerLocation.user_id,
        businessName: client.business_name,
        eventType: "Failure",
        message: `Error syncing customer in ${customerLocation.serviceUsing}: ${error.message}`,
        customData: error.response ? error.response.data : error,
        platform: "Highlevel",
        event: "Customer created in Highlevel",
      });
    }
  }
  res.status(200).send("Webhook received successfully");
  console.log("/////*******************************************/////");
};

// Appointment Booked in Highlevel
const handleAppointmentBooked = async (req, res) => {
  console.log("/////*******************************************/////");
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

  const client = await Client.findOne({
    user_id: customerLocation.user_id,
  });

  const payload = {
    address: bookedAppointment.full_address,
    // business_name: "",
    email: bookedAppointment.email,
    first_name: bookedAppointment.first_name,
    last_name: bookedAppointment.last_name,
    phone: bookedAppointment.phone,
    // status: bookedAppointment.calendar.status, // Lead Status In Service
    appointment_type_id: 0,
  };

  if (bookedAppointment?.calendar?.status?.toLowerCase() == "booked") {
    // Create Lead in Syncro/RepairShopr
    if (
      customerLocation.serviceUsing == "Syncro" ||
      customerLocation.serviceUsing == "RepairShopr"
    ) {
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
        console.log(
          `lead created in ${customerLocation.serviceUsing}`,
          res.data
        );

        // Log success
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          businessName: client.business_name,
          platform: "Highlevel",
          event: "Appointment Booked in Highlevel",
          eventType: "Success",
          message: `Lead created in ${customerLocation.serviceUsing} successfully`,
          customData: res.data,
        });
      } catch (error) {
        console.log(error.response);
        // Log failure
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          businessName: client.business_name,
          platform: "Highlevel",
          event: "Appointment Booked in Highlevel",
          eventType: "Failure",
          message: `Error creating lead in ${customerLocation.serviceUsing}: ${error.response.data.message}`,
          customData: error.response ? error.response.data : error,
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
        console.log(
          `lead created in ${customerLocation.serviceUsing}`,
          res.data
        );

        if (res.data.success) {
          // Log success
          await ActivityLog.create({
            user_id: customerLocation.user_id,
            businessName: client.business_name,
            platform: "Highlevel",
            event: "Appointment Booked in Highlevel",
            eventType: "Success",
            message: `Lead created in ${customerLocation.serviceUsing} successfully`,
            customData: res.data,
          });
        } else {
          throw res.data;
        }
      } catch (error) {
        console.log(error);
        // Log failure
        await ActivityLog.create({
          user_id: customerLocation.user_id,
          businessName: client.business_name,
          platform: "Highlevel",
          event: "Appointment Booked in Highlevel",
          eventType: "Failure",
          message: `Error creating lead in ${customerLocation.serviceUsing}: ${error.response.data.message}`,
          customData: error.response ? error.response.data : error,
        });
      }
    }
  }

  res.status(200).send("Webhook received successfully");
  console.log("/////*******************************************/////");
};

module.exports = {
  handleCustomerCreation,
  handleAppointmentBooked,
};
