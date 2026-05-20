import pool from './config/database.js'; pool.query('SELECT * FROM public.\
ORDER_ITEM\ LIMIT 1').then(res=>console.log(res.rows)).catch(err=>console.error('ERROR:', err)); setTimeout(()=>process.exit(0),2000)
