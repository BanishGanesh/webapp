const express=require('express')
const cors=require('cors')
const app=express()
app.use(express.json())
app.use(express.urlencoded({extended:true}))
const multer = require("multer");
const winston = require("winston")
const statsd = require("node-statsd")

const logger = winston.createLogger({
  // level: 'info', // Set the logging level
  format: winston.format.json(), // Set the log format to JSON
  transports: [
    new winston.transports.Console(), // Log to the console
    new winston.transports.File({ filename: 'Logs/app_logs.log' }) // Log to a file
  ]
});

const statsdClient=new statsd(
  {host: 'localhost',
  port: 8125}
)

const routers=require('./Routes/userRouter.js')
const routersp=require('./Routes/productRoutes.js')
const routersImage = require("./Routes/imageRoutes.js");
app.use('/v2/user',routers)
app.use('/v1/product',routersp)
app.use("/v1/product", routersImage);
var portfinder = require("portfinder");
// const { routes } = require('.')
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      res.status(400).json({ message: 'Invalid field name for file upload' });
    } else {
      next(err);
    }
  });
portfinder.getPort(function (err, port) {
    process.env.PORT = port;
    app.listen(port, () => console.log(`Server Started on port ${port}...`));
}); 

app.get("/healthz", async (req, res) => {
    statsdClient.increment('HEALTH.Healthz.count');
    logger.log('info','Request received endpoint has been hit for Healthz API');
    res.status(200).send("OK");
});

module.exports  = app;