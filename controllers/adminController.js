const { getConnection } = require('../db/dbconfig');
const session = require('express-session');
const {getSessionUser} = require('./authController')


async function getPosts(req, res) {

    const user = getSessionUser(req); // Assuming the seller's ID is stored in session
    // const sellerId = user.user_id
    console.log(user.user_id)

    const query = `SELECT u.user_name AS buyer_name, u.email AS buyer_email, t.transaction_id, t.units_bought, 
    p.price_per_unit, p.post_id, p.seller_id, s.user_name AS seller_name, s.email AS seller_email FROM users u 
    JOIN transactions t ON u.user_id = t.buyer_id JOIN posts p ON p.post_id = t.post_id JOIN users s ON
    p.seller_id = s.user_id WHERE t.status = 'Progress';`;
    let connection;

    try {
        connection = await getConnection();
        const result = await connection.execute(query, { seller_id : user.user_id });
        console.log(result)

        const posts = result.rows.map(row => ({
            user_name: row[0],
            email: row[1],
            trans_id: row[2], 
            units: row[3],
            post_id: row[4]
        }));

        res.status(200).json({ posts });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching seller posts', details: err.message });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}
