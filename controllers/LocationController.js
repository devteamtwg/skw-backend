const Location = require("../models/location");
const Locationhl = require("../models/locationhl");

const location_all = (req, res) => {
  let id = req.params.id;
  run();
  async function run() {
    try {
      const locations = await Location.find({ user_id: id }).sort([
        ["createdAt", "descending"],
      ]);

      res.status(200).json({ data: locations });
    } catch (e) {
      res.status(500).json({ error: "Something went wrong!!", messege: e });
    }
  }
};

const location_detail = (req, res) => {
  let id = req.params.id;
  run();
  async function run() {
    try {
      const locations = await Location.findById(id);
      res.status(200).json({ data: locations });
    } catch (e) {
      res.status(500).json({ erro: "Something went wrong!!", message: e });
    }
  }
};

const location_create = (req, res) => {
  let body = req.body;
  run();
  async function run() {
    try {
      const locations = await Location.create(body);
      locations.save;

      res.status(200).json({ data: locations });
    } catch (e) {
      res.status(500).json({ error: "Something went wrong!!", message: e });
    }
  }
};

const location_update = (req, res) => {
  let id = req.params.id;
  let body = req.body;

  run();
  async function run() {
    try {
      const locations = await Location.updateOne({ _id: id }, { $set: body });
      res.status(200).json({ data: locations });
    } catch (e) {
      res.status(500).json({ error: "Something went wrong!!", message: e });
    }
  }
};

const location_delete = (req, res) => {
  let id = req.params.id;

  run();
  async function run() {
    try {
      const locations = await Location.deleteOne({ _id: id });
      res.status(200).json({ data: locations });
    } catch (e) {
      res.status(500).json({ error: "Something went wrong!!", message: e });
    }
  }
};

const hl_all = (req, res) => {
  let id = req.params.id;
  run();
  async function run() {
    try {
      const locationhls = await Locationhl.find({ user_id: id }).sort([
        ["createdAt", "descending"],
      ]);

      res.status(200).json({ data: locationhls });
    } catch (e) {
      res.status(500).json({ error: "Something went wrong!!", messege: e });
    }
  }
};

const hl_data = async (req, res) => {
  let body = req.body;

  try {
    console.log("body", body);

    const data = {
      user_id: body.user_id,
      hl_user_id: body.token_response.userId,
      hl_company_id: body.token_response.companyId,
      hl_access_token: body.token_response.access_token,
      hl_refresh_token: body.token_response.refresh_token,
      hl_location_id: body.token_response.locationId,
      hl_location_title: body.location_data.location.name,
      hl_location_email: body.location_data.location.email,
      hl_location_phone: body.location_data.location.phone,
      hl_location_address: body.location_data.location.address,
      hl_location_city: body.location_data.location.city,
      hl_location_country: body.location_data.location.country,
      hl_location_calender_id: null,
      custom_fields_trigger: body.custom_fields_trigger,
      custom_fields_type: body.custom_fields_type,
      custom_fields_data: body.custom_fields_data,
    };

    // Check if the location already exists
    const findLocation = await Locationhl.findOne({
      user_id: data.user_id,
      hl_location_id: data.hl_location_id,
    });

    if (findLocation) {
      // Update the existing location
      const updatedLocationHl = await Locationhl.updateOne(
        { user_id: data.user_id, hl_location_id: data.hl_location_id },
        { $set: data }
      );
      res.status(200).json({ data: updatedLocationHl });
    } else {
      // Add the new location
      const createdLocationHl = await Locationhl.create(data);
      res.status(200).json({ data: createdLocationHl });
    }
  } catch (e) {
    console.error("Error:", e);
    res.status(500).json({ error: "Something went wrong!!", message: e });
  }
};

const hl_data_cid = (req, res) => {
  let id = req.params.id;
  let body = req.body;

  run();
  async function run() {
    try {
      const locations = await Locationhl.updateOne({ _id: id }, { $set: body });
      res.status(200).json({ data: locations });
    } catch (e) {
      res.status(500).json({ error: "Something went wrong!!", message: e });
    }
  }
};

// Update Location's Service

const update_location_service = async (req, res) => {
  const { serviceUsing, serviceApiKey, serviceSubdomain, locationId } =
    req.body;

  try {
    const findSubdomain = await Locationhl.findOne({ serviceSubdomain });

    if (findSubdomain) {
      res.status(400).json({ message: "This Subdomain is already taken" });
      return;
    }
    const updatedLocation = await Locationhl.updateOne(
      { hl_location_id: locationId },
      {
        $set: {
          serviceUsing,
          serviceApiKey,
          serviceSubdomain,
        },
      }
    );

    res.status(200).json({ data: updatedLocation });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
    console.log(error);
  }
};

module.exports = {
  location_all,
  location_detail,
  location_create,
  location_update,
  location_delete,
  hl_all,
  hl_data,
  hl_data_cid,
  update_location_service,
};
