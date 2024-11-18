// config/dbConfig.js
const oracledb = require('oracledb');
oracledb.initOracleClient({ libDir: 'C:\\Users\\abc\\Downloads\\instantclient-basic-windows.x64-19.24.0.0.0dbru\\instantclient_19_24' });  // Replace with your actual path

const dbConfig = {
  user: process.env.db_user,
  password: process.env.db_password,
  connectString: process.env.db_connectString
};

async function getConnection() {
  return await oracledb.getConnection(dbConfig);
}

module.exports = { getConnection };
