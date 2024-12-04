const { getConnection } = require('../db/dbconfig');
const { route } = require('../routes');
const {getSessionUser} = require('./authController')
const session = require('express-session');

async function getProgressTransactions(req, res) {
    res.setHeader('Cache-Control', 'no-store');  // Prevent caching
res.setHeader('Pragma', 'no-cache');  // Older HTTP versions support this
res.setHeader('Expires', '0');  // Set expiration to 0

    console.log('erf')
    const query = `
        SELECT 
            T.*, u.email, u1.email, P.LOCATION_ID, LOC.ADDRESS FROM 
            TRANSACTIONS T 
        JOIN 
            POSTS P ON T.POST_ID = P.POST_ID
        JOIN 
            users u on p.seller_id = u.user_id
        join
            users u1 on t.buyer_id = u1.user_id
        join
            LOCATION LOC ON P.LOCATION_ID = LOC.LOCATION_ID
        WHERE 
            T.STATUS = 'Progress'
    `;
    let connection;
    try {
        console.log('ewr')
        connection = await getConnection();
        console.log('ewr')
        const result = await connection.execute(query);
        console.log('ewr')
        const posts = result.rows.map(row => ({
            transaction_id: row[0],
            post_id: row[2],
            units: row[3], 
            total: row[4],
            date: row[6],
            s_mail: row[7],
            b_mail: row[8],
            loc_id: row[9],
            address: row[10],
        }));
        console.log(posts);
        res.status(200).json(posts);
        
    } catch (err) {
        console.error('Error occurred:', err.message);
        res.status(500).json({ err: "Error in fetching", detail: err.message });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

async function getTechniciansByLocation(req, res) {
    res.setHeader('Cache-Control', 'no-store');  // Prevent caching
res.setHeader('Pragma', 'no-cache');  // Older HTTP versions support this
res.setHeader('Expires', '0');  // Set expiration to 0
    console.log("ab")
    const { locationId } = req.params;
    const query = `
        SELECT TECHNICIAN_ID, TECHNICIAN_NAME 
        FROM TECHNICIAN 
        WHERE TECHNICIAN_ID IN (
            SELECT TECHNICIAN_ID 
            FROM WORKS_ON 
            WHERE LOCATION_ID = :LOCATION_ID
        )
    `;
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(query, { LOCATION_ID: locationId });
        console.log(result.rows)
        const technicians = result.rows.map(row => ({
            tech_id: row[0],
            tech_name: row[1]
            }));
        res.status(200).json(technicians);
    } catch (err) {
        res.status(500).json({ error: "Error fetching technicians", details: err.message });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

async function assignTechnician(req, res) {
    const { transaction_id, technicianId } = req.body;
    console.log("Request Body")
    console.log(req.body)
    const query = `
      INSERT INTO COMMISSION (COMMISSION_ID, COMMISSION_RECEIVED, MONTHLY_PAYMENTS_REMAINING, 
      TRANSACTION_ID, TECHNICIAN_ID) VALUES (COMM_ID_SEQ.NEXTVAL, 500, 1, :TRANSACTION_ID, :TECHNICIAN_ID)
    `;
    const updateQuery = `UPDATE TRANSACTIONS SET STATUS = 'RECURRING' WHERE TRANSACTION_ID = :TRANSACTION_ID`;
    let connection;
    try {
      connection = await getConnection();
      await connection.execute(query, {
        TRANSACTION_ID: transaction_id,
        TECHNICIAN_ID: technicianId,
      });
      await connection.execute(updateQuery, {TRANSACTION_ID: transaction_id});
      await connection.commit();
      console.log("pass")
      res.status(200).send('Technician assigned successfully');
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (connection) await connection.close();
    }
  }

  async function getRecurringPosts(req, res) {
    
    res.setHeader('Cache-Control', 'no-store');  // Prevent caching
    res.setHeader('Pragma', 'no-cache');  // Older HTTP versions support this
    res.setHeader('Expires', '0');  // Set expiration to 0
    const query = `SELECT 
            T.*, u.email, u1.email, P.LOCATION_ID, LOC.ADDRESS FROM 
            TRANSACTIONS T 
        JOIN 
            POSTS P ON T.POST_ID = P.POST_ID
        JOIN 
            users u on p.seller_id = u.user_id
        join
            users u1 on t.buyer_id = u1.user_id
        join
            LOCATION LOC ON P.LOCATION_ID = LOC.LOCATION_ID
        WHERE 
            T.STATUS = 'Recurring' or T.STATUS = 'RECURRING'
    `;
    let connection;
    try {
      connection = await getConnection();
      const result = await connection.execute(query);
      const posts = result.rows.map(row => ({
        transaction_id: row[0],
        post_id: row[2],
        units: row[3], 
        total: row[4],
        date: row[6],
        s_mail: row[7],
        b_mail: row[8],
        loc_id: row[9],
        address: row[10]
    }));
      res.status(200).json(posts);
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (connection) await connection.close();
    }
  }
    module.exports = { getProgressTransactions, assignTechnician, getTechniciansByLocation, getRecurringPosts};


