const express = require("express");
const app = express();
const path = require("path");
const dbPath = path.join(__dirname, "covid19India.db");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
let db = null;
app.use(express.json());
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB ERROR :  ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const objectSnakeToCamel = (newObject) => {
  return {
    stateId: newObject.state_id,
    stateName: newObject.state_name,
    population: newObject.population,
  };
};

const districtSnakeToCamel = (newObject) => {
  return {
    districtId: newObject.district_id,
    districtName: newObject.district_name,
    stateId: newObject.state_id,
    cases: newObject.cases,
    cured: newObject.cured,
    active: newObject.active,
    deaths: newObject.deaths,
  };
};

const reportSnakeToCamelCase = (newObject) => {
  return {
    totalCases: newObject.cases,
    totalCured: newObject.cured,
    totalActive: newObject.active,
    totalDeaths: newObject.deaths,
  };
};

//Returns a list of all states in the state table

app.get("/states/", async (request, response) => {
  const getAllStatesList = `SELECT * 
    FROM state
    ORDER BY state_id;`;

  const statesList = await db.all(getAllStatesList);
  const statesResult = statesList.map((eachObject) => {
    return objectSnakeToCamel(eachObject);
  });
  response.send(statesResult);
});

//Returns a state based on the state ID

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getState = `SELECT * FROM state
    WHERE state_id = ${stateId};`;

  const newState = await db.get(getState);
  const stateResult = objectSnakeToCamel(newState);
  response.send(stateResult);
});

//Create a district in the district table

app.post("/districts/", async (request, response) => {
  const createDistrict = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = createDistrict;

  const newDistrictQuery = `INSERT INTO 
district(district_name,state_id,cases,cured,active,deaths)
VALUES
('${districtName}',
${stateId},
${cases},
${cured},
${active},
${deaths});`;

  const addDistrict = await db.run(newDistrictQuery);
  const districtId = addDistrict.lastId;
  response.send("District Successfully Added");
});

//Returns a district based on the district ID

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrict = `SELECT * FROM district
    WHERE district_id = ${districtId};`;

  const newDistrict = await db.get(getDistrict);
  const districtResult = districtSnakeToCamel(newDistrict);
  response.send(districtResult);
});

//Deletes a district from the district table based on the district ID

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrict = `DELETE 
FROM district
WHERE district_id = ${districtId};`;

  await db.run(deleteDistrict);
  response.send("District Removed");
});

//Updates the details of a specific district based on the district ID

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const UpdateDistrictQuery = `UPDATE district
SET 
district_name = '${districtName}',
state_id = ${stateId},
cases = ${cases},
cured = ${cured},
active = ${active},
deaths = ${deaths}
WHERE district_id = ${districtId};`;

  await db.run(UpdateDistrictQuery);
  response.send("District Details Updated");
});

//Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateReportQuery = `SELECT SUM(cases) AS cases,
    SUM(cured) AS cured,
    SUM(active) AS active,
    SUM(deaths) AS deaths
    FROM district
    WHERE state_id = ${stateId};`;

  const stateReport = await db.get(getStateReportQuery);
  const resultReport = reportSnakeToCamelCase(stateReport);
  response.send(resultReport);
});

//Returns an object containing the state name of a district based on the district ID

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateDetails = `SELECT state_name
    FROM state JOIN district
    ON state.state_id = district.state_id
    WHERE district.district_id = ${districtId};`;
  const stateName = await db.get(stateDetails);
  response.send({ stateName: stateName.state_name });
});

module.exports = app;
