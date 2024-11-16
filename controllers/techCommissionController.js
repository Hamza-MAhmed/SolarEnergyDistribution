const { getConnection } = require('../db/dbconfig');
const {getSessionUser} = require('./authController')
const session = require('express-session');

async function getTransactions(req , res){
    const query = `SELECT T.*, P.LOCATION_ID FROM TRANSACTIONS T JOIN POSTS P ON T.POST_ID = P.POST_ID
    WHERE T.STATUS = 'Progress'`;
    const locationQuery = "SELECT LOCATION FROM"
    let connection;
    try{
        connection = await getConnection();
        const result = await connection.execute(query);
        res.status(200).json(result.rows);
    }
    catch(err){
        res.status(500).json({err: "Error in fetching", detail: err.message});
    }
    finally{
        if(connection){
            await connection.close
        }
    }
}

async function assignTechnician(req, res) {
    const id = 1;
    const loc_id = 3;
    const commission_received = 500;
    const tId= 3
    const query1 = `SELECT * FROM TECHNICIAN WHERE TECHNICIAN_ID IN (SELECT TECHNICIAN_ID FROM WORKS_ON
    WHERE LOCATION_ID = :LOCATION_ID)`;   //for drop down of technicians
    
    const query = `INSERT INTO Commission (COMMISSION_ID, commission_received, monthly_payments_remaining,
    transaction_id, technician_id) VALUES (COMM_ID_SEQ.NEXTVAL, :commission_Received, 
    :monthly_Payments_Remaining, :transaction_Id, :technician_Id)`;
    const updateQuery = `UPDATE TRANSACTIONS SET STATUS = 'RECURRING' WHERE TRANSACTION_ID = :TRANSACTION_ID`;

    let connection;
    try{
        connection = await getConnection();
        await connection.execute(query,{
            commission_received: commission_received,
            monthly_payments_remaining: 1, 
            transaction_id: id,
            technician_id: tId});

        await connection.execute(updateQuery, {transaction_id : id});
        await connection.commit();

        res.status(200).json({ message: 'Technician assigned and commission recorded.' });
        } catch (err) {
            res.status(500).json({ error: 'Error assigning technician', details: err.message });
        }    
        finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    console.error('Error closing connection:', err);
                }
            }
        }
    }
module.exports = { getTransactions, assignTechnician };

