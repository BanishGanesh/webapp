const db = require('../model')
const { users } = require('../model');
const bcrypt = require("bcrypt");
const imageController = require("./ImageController");
const AWS = require("aws-sdk");
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

logger.info('info','This is a log message');

const User = db.users
const Product = db.products
const Image = db.images

const awsBucketName = process.env.AWS_BUCKET_NAME;


const s3 = new AWS.S3({

  region: process.env.AWS_REGION

});
let checkQuantity = (str) => {
    var regName = /^[0-9]/;
    return str != "" && str.match(regName);
};

let isEmail = (email) => {
    var emailFormat = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (email.match(emailFormat)) {
        return true;
    }
    return false;
};


const addproduct = async (req, res) => {
  statsdClient.increment('POST.addproduct.count');
  logger.log('info','Request received endpoint has been hit for addproduct API');
  let authorizationSuccess = false;
  let userDetails = "";
  let authheader = req.headers.authorization;
  if (!authheader) {
    res.status(401).send("Unauthorized");
  } else {
    //User Auth Check Start
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];
    if (!isEmail(username)) {
      res.status(401).send("Authentication Failed, Please enter a valid email");
      logger.log('error','Request received: Authentication Failed, Please enter a valid email');
    } else {
      userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        console.log("------> User Not Found");
        logger.log('error','Request received: ------> User Not Found');
        res.status("User Not Found").sendStatus(401);
      } else {
        bcrypt.compare(password, userDetails.password, (err, result) => {
          if (err) throw err;
          authorizationSuccess = result;
          if (authorizationSuccess) {
            console.log("Authorization Successful!");
            logger.log('info','Request received: Authorization Successful!');
            const allowedParams = [
              "name",
              "description",
              "sku",
              "manufacturer",
              "quantity",
            ];
            const receivedParams = Object.keys(req.body);
            const unwantedParams = receivedParams.filter(
              (param) => !allowedParams.includes(param)
            );
            const notReceivedParams = allowedParams.filter(
              (param) => !receivedParams.includes(param)
            );

            if (unwantedParams.length) {
              res.status(400).send({
                error: `The following parameters are not allowed: ${unwantedParams.join(
                  ", "
                )}`,
              });
              logger.log('error','The following parameters are not allowed:');
            } else if (notReceivedParams.length) {
              res.status(400).send({
                error: `The following required parameters are not received: ${notReceivedParams.join(
                  ", "
                )}`,
              });
              logger.log('error','The following required parameters are not received');
            } else {
              const name = req.body.name;
              const description = req.body.description;
              const sku = req.body.sku;
              const manufacturer = req.body.manufacturer;
              const quantity = req.body.quantity;
              if (name == undefined || name == null || name == "") {
                res.status(400).send("Product Name is required!");
                logger.log('error','Product Name is required!');
              } else if (
                description == undefined ||
                description == null ||
                description == ""
              ) {
                res.status(400).send("Product description is required!");
                logger.log('error','Product description is required!');
              } else if (sku == undefined || sku == null) {
                res.status(400).send("Product sku is required!");
                logger.log('error','Product sku is required!');
              } else if (
                manufacturer == undefined ||
                manufacturer == null ||
                manufacturer == ""
              ) {
                res.status(400).send("Product manufacturer is required!");
                logger.log('error','Product manufacturer is required!');
              } else if (
                quantity == undefined ||
                quantity == null ||
                quantity == ""
              ) {
                res.status(400).send("Product quantity is required!");
                logger.log('error','Product quantity is required!');
              } else if (
                !(typeof quantity === "number" && Number.isInteger(quantity))
              ) {
                res.status(400).send("Product quantity needs to be Integer!");
                logger.log('error','Product quantity needs to be Integer!');
              } else if (quantity <= 0 || quantity > 100) {
                res
                  .status(400)
                  .send("Product quantity needs to be between 0 to 100!");
                  logger.log('error','Product quantity needs to be between 0 to 100!');
              } else {
                searchProduct(sku).then((productDetails) => {
                  if (productDetails) {
                    res.status(400).send("Product SKU already exists");
                    logger.log('error','Request received: Product SKU already exists');
                  } else {
                    let newProduct = {
                      name: req.body.name,
                      description: req.body.description,
                      sku: req.body.sku,
                      manufacturer: req.body.manufacturer,
                      quantity: req.body.quantity,
                      owner_user_id: userDetails.id,
                    };
                    createProduct(newProduct).then((product) => {
                      let createdProductDetails = product.dataValues;
                      res.status(201).send({
                        id: createdProductDetails.id,
                        name: createdProductDetails.name,
                        description: createdProductDetails.description,
                        sku: createdProductDetails.sku,
                        manufacturer: createdProductDetails.manufacturer,
                        quantity: createdProductDetails.quantity,
                        date_added: createdProductDetails.date_added,
                        date_last_updated:
                          createdProductDetails.date_last_updated,
                        owner_user_id: createdProductDetails.owner_user_id,
                      });
                    });
                  }
                });
              }
            }
          } else {
            console.log("Authentication Failed");
            logger.log('error','Request received: Authentication Failed');
            res.status(401).send("Authentication Failed");
          }
        });
      }
    }
    //User Auth Check End
  }

}

const getproduct = async (req,res) => {
    statsdClient.increment('GET.getproduct.count');
    logger.log('info','Request received endpoint has been hit for getproduct API');
    const productId = req.params.productId;
    let sproduct = await Product.findOne({ where: { id: productId } })
    console.log(sproduct)
    if (productId == sproduct.id) {
        // console.log("Authentication Successful");
        //console.log(resu);
        res.status(200).send({
            id: sproduct.id,
            name: sproduct.name,
            description: sproduct.description,
            sku: sproduct.sku,
            manufacturer: sproduct.manufacturer,
            quantity: sproduct.quantity,
            date_added: sproduct.date_added,
            date_last_updated: sproduct.date_last_updated,
            owner_user_id: sproduct.owner_user_id
        });
    } else{
        res.sendStatus(400).send("product not available");
        logger.log('error','product not available');
        
    }

}

const deleteproduct = async (req,res) => {
    statsdClient.increment('DELETE.deleteproduct.count');
    logger.log('info','Request received endpoint has been hit for deleteproduct API');
    const productId = req.params.productId;
    let sproduct = await Product.findOne({ where: { id: productId } })
    console.log(sproduct);
    let authheader = req.headers.authorization;
    if (!authheader) {

        res.status(401).send("basic authentication not present");
        logger.error('basic authentication not present');

    }
    else {
        var auth = new Buffer.from(authheader.split(" ")[1], "base64")
            .toString()
            .split(":");
        var username = auth[0];
        var password = auth[1];
        if (!isEmail(username)) res.status(400).send("Bad request - Enter Valid email");
        else {
            let suser = await User.findOne({ where: { username: username } })
            console.log(suser)
            if (suser == null) {
                console.log("------> User Not Found");
                res.status("Authentication Failed ,Username/password wrong").sendStatus(404);
                logger.error('Authentication Failed ,Username/password wrong');
            }
            else {
              const imagesList = await getAllImagesByProduct(productId);
                bcrypt.compare(password, suser.password, async (err, resu) => {
                    if (err) throw err;
                    console.log(resu);
                    if (resu) {
                        console.log("Authentication Successful");
                        logger.log('info','Authentication Successful');
                        console.log(resu);
                        let productss = await Product.findOne({ where: { id: productId } })
                        if(!productss){
                            res.status(404).send("Product is not available");
                            logger.error('Product is not available');

                        }   else if(sproduct.owner_user_id != suser.id){
                            res.status("Forbidden").sendStatus(403);
                            logger.error('Forbidden');
                          }
                        
                        else{
                          const imagesList = await getAllImagesByProduct(productId);
                            try{
                                  console.log(productId);
                                  deleteImagesInS3WithProductId(productId,imagesList);
                                  const book = await db.products.destroy({
                                    where: {
                                      id : productId
                                    }
                                  });
                                  res.status(204).send('product deleted');
                                  logger.log('info','product deleted');
                                } catch (err) {
                                  res.send(err);
                                }
                        }

                    }

                    else {
                        console.log("Authentication Failed");
                        res.status(401).send("Unauthorized");
                        logger.error('Unauthorized');
                    }
                });
            }

        }
    }

}

const updateproduct = async (req,res) => {
  statsdClient.increment('UPDATE.updateproduct.count');
  logger.log('info','Request received endpoint has been hit for updateproduct API');
  const productId = req.params.productId;
  let authorizationSuccess = false;
  let userDetails = "";
  let authheader = req.headers.authorization;
  if (!authheader) {
    res.status(401).send("Unauthorized");
    logger.log('error','Unauthorized');
  } else {
    //User Auth Check Start
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];
    if (!isEmail(username)) {
      res.status(401).send("Authentication Failed, Please enter a valid email");
      logger.error('Authentication Failed, Please enter a valid email');
    } else {
      userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        console.log("------> User Not Found");
        res.status("User Not Found").sendStatus(401);
        logger.error('Request received endpoint has been hit for updateproduct API');
      } else {
        bcrypt.compare(password, userDetails.password, (err, result) => {
          if (err) throw err;
          authorizationSuccess = result;
          if (authorizationSuccess) {
            console.log("Authorization Successful!");
            logger.log('info','Request received endpoint has been hit for updateproduct API');
            searchProductWithId(productId).then((product) => {
                if(product == null){
                    res.status(400).send("Product Not Found");
                }
              else if (userDetails.id == product.owner_user_id) {
                //Updating Product Details
                const allowedParams = [
                  "name",
                  "description",
                  "sku",
                  "manufacturer",
                  "quantity",
                ];
                const receivedParams = Object.keys(req.body);
                const unwantedParams = receivedParams.filter(
                  (param) => !allowedParams.includes(param)
                );
                const notReceivedParams = allowedParams.filter(
                  (param) => !receivedParams.includes(param)
                );

                if (unwantedParams.length) {
                  res.status(400).send({
                    error: `The following parameters are not allowed: ${unwantedParams.join(
                      ", "
                    )}`,
                  });
                  logger.error("The following parameters are not allowed")
                } else if (notReceivedParams.length) {
                  res.status(400).send({
                    error: `The following required parameters are not received: ${notReceivedParams.join(
                      ", "
                    )}`,
                  });
                  logger.error("The following required parameters are not received")
                } else {
                  const name = req.body.name;
                  const description = req.body.description;
                  const sku = req.body.sku;
                  const manufacturer = req.body.manufacturer;
                  const quantity = req.body.quantity;
                  if (name == undefined || name == null || name == "") {
                    res.status(400).send("Product Name is required!");
                    logger.error('Request received endpoint has been hit for updateproduct API');
                  } else if (
                    description == undefined ||
                    description == null ||
                    description == ""
                  ) {
                    res.status(400).send("Product description is required!");
                    logger.error('Product description is required!');
                  } else if (sku == undefined || sku == null || sku == "") {
                    res.status(400).send("Product sku is required!");
                    logger.error('Product sku is required!');
                  } else if (
                    manufacturer == undefined ||
                    manufacturer == null ||
                    manufacturer == ""
                  ) {
                    res.status(400).send("Product manufacturer is required!");
                    logger.error('Product manufacturer is required!');
                  } else if (
                    quantity == undefined ||
                    quantity == null ||
                    quantity == ""
                  ) {
                    res.status(400).send("Product quantity is required!");
                    logger.error('Product quantity is required!');
                  } else if (
                    !(
                      typeof quantity === "number" && Number.isInteger(quantity)
                    )
                  ) {
                    res
                      .status(400)
                      .send("Product quantity needs to be Integer!");
                      logger.error('Product quantity needs to be Integer!');
                  } else if (quantity <= 0 || quantity > 100) {
                    res
                      .status(400)
                      .send("Product quantity needs to be between 0 to 100!");
                      logger.error('Product quantity needs to be between 0 to 100!');
                  } else {
                    searchProductWithId(productId).then((productDetails) => {
                      if (!productDetails) {
                        res.status(403).send("Product not found");
                        logger.error('Product not found');
                      } else if (
                        productDetails.owner_user_id != userDetails.id
                      ) {
                        res.status(403).send("Forbidden");
                        logger.error('Forbidden');
                      } else {
                        let newProduct = {
                          id: productId,
                          name: req.body.name,
                          description: req.body.description,
                          sku: req.body.sku,
                          manufacturer: req.body.manufacturer,
                          quantity: req.body.quantity,
                        };
                        searchProduct(sku).then((prod) => {
                          if (prod!=null && prod.id!=productId) {
                            res.status(400).send("Product SKU already exists");
                            logger.error('Product SKU already exists');
                          } else {
                            //Update Product Function
                            updateProduct(newProduct).then((product) => {
                              console.log("updatedProd");
                              logger.log('info','updatedProd');
                              console.log(product);
                              res.sendStatus(204);
                            });
                          }
                        });
                      }
                    });
                  }
                }
              } else {
                res.status("Forbidden").sendStatus(403);
                logger.warn('Forbidden');
              }
            });
          } else {
            console.log("Authentication Failed");
            res.status(401).send("Authentication Failed");
            logger.error('Authentication Failed');
          }
        });
      }
    }
  }

}

const patchproduct = async (req,res) => {
  statsdClient.increment('PATCH.patchproduct.count');
  logger.log('info','Request received endpoint has been hit for patchproduct API');
  const productId = req.params.productId;
  let authorizationSuccess = false;
  let userDetails = "";
  let authheader = req.headers.authorization;
  if (!authheader) {
    res.status(401).send("Unauthorized");
    logger.error("Unauthorized")
  } else {
    //User Auth Check Start
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];
    if (!isEmail(username)) {
      res.status(401).send("Authentication Failed, Please enter a valid email");
      logger.error("Authentication Failed, Please enter a valid email")
    } else {
      userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        console.log("------> User Not Found");
        res.status("User Not Found").sendStatus(401);
        logger.error("User Not Found")
      } else {
        bcrypt.compare(password, userDetails.password, (err, result) => {
          if (err) throw err;
          authorizationSuccess = result;
          if (authorizationSuccess) {
            console.log("Authorization Successful!");
            logger.info("Authorization Successful!")
            searchProductWithId(productId).then((product) => {
                if(product == null){
                    res.status(400).send("Product Not Found");
                    logger.error("Product Not Found")
                }
              else if (userDetails.id == product.owner_user_id) {
                //Updating Product Details
                const allowedParams = [
                  "name",
                  "description",
                  "sku",
                  "manufacturer",
                  "quantity",
                ];
                const receivedParams = Object.keys(req.body);
                const unwantedParams = receivedParams.filter(
                  (param) => !allowedParams.includes(param)
                );
                const notReceivedParams = allowedParams.filter(
                  (param) => !receivedParams.includes(param)
                );

                if (unwantedParams.length) {
                  res.status(400).send({
                    error: `The following parameters are not allowed: ${unwantedParams.join(
                      ", "
                    )}`,
                  });
                  logger.error("The following parameters are not allowed");
                }
                // else if (notReceivedParams.length) {
                //   res.status(400).send({
                //     error: `The following required parameters are not received: ${notReceivedParams.join(
                //       ", "
                //     )}`,
                //   });
                // }
                else {
                  let name = req.body.name;
                  let description = req.body.description;
                  let sku = req.body.sku;
                  let manufacturer = req.body.manufacturer;
                  let quantity = req.body.quantity;
                  if (
                    receivedParams.includes("name") &&
                    (name == null || name == "")
                  ) {
                    res.status(400).send("Product Name cannot be null!");
                    logger.error("Product Name cannot be null!");

                  } else if (
                    receivedParams.includes("description") &&
                    (description == null || description == "")
                  ) {
                    res.status(400).send("Product description is required!");
                    logger.error("Product description is required!");
                  } else if (
                    receivedParams.includes("sku") &&
                    (sku == "" || sku == null)
                  ) {
                    res.status(400).send("Product sku is required!");
                    logger.error("Product sku is required!");
                  } else if (
                    receivedParams.includes("manufacturer") &&
                    (manufacturer == null || manufacturer == "")
                  ) {
                    res.status(400).send("Product manufacturer is required!");
                    logger.error("Product manufacturer is required!");
                  } else if (
                    receivedParams.includes("quantity") &&
                    (quantity == null || quantity == "")
                  ) {
                    res.status(400).send("Product quantity is required!");
                    logger.error("Product quantity is required!");
                  } else if (
                    receivedParams.includes("quantity") &&
                    !(
                      typeof quantity === "number" && Number.isInteger(quantity)
                    )
                  ) {
                    res
                      .status(400)
                      .send("Product quantity needs to be Integer!");
                      logger.error("Product quantity needs to be Integer!");
                  } else if (quantity <= 0 || quantity > 100) {
                    res
                      .status(400)
                      .send("Product quantity needs to be between 0 to 100!");
                      logger.error("Product quantity needs to be between 0 to 100!");
                  } else {
                    searchProductWithId(productId).then((productDetails) => {
                      if (!productDetails) {
                        res.status(403).send("Product not found");
                        logger.warn("Product not found");
                      } else if (
                        productDetails.owner_user_id != userDetails.id
                      ) {
                        res.status(403).send("Forbidden");
                        logger.warn("Forbidden");
                      } else {
                        if (name == undefined) name = productDetails.name;
                        if (description == undefined)
                          description = productDetails.description;
                        if (manufacturer == undefined)
                          manufacturer = productDetails.manufacturer;
                        if (sku == undefined) sku = productDetails.sku;
                        if (quantity == undefined)
                          quantity = productDetails.quantity;
                        let newProduct = {
                          id: productId,
                          name: name,
                          description: description,
                          sku: sku,
                          manufacturer: manufacturer,
                          quantity: quantity,
                        };
                        searchProduct(sku).then((prod) => {
                          if (prod && receivedParams.includes("sku") && prod.id!=productId) {
                            res.status(400).send("Product SKU already exists");
                            logger.error("Product SKU already exists");
                          } else {
                            //Update Product Function
                            updateProduct(newProduct).then((product) => {
                              console.log("updatedProd");
                              console.log(product);
                              res.sendStatus(204);
                            });
                          }
                        });
                      }
                    });
                  }
                }
              } else {
                res.status("Forbidden").sendStatus(403);
                logger.error("Forbidden");
              }
            });
          } else {
            console.log("Authentication Failed");
            res.status(401).send("Authentication Failed");
            logger.error("Authentication Failed");
          }
        });
      }
    }
  }
      
}

const searchProduct = async (sku) => {
  const productDetails = await Product.findOne({
    where: {
      sku: sku,
    },
  });
  return productDetails;
};

const searchProductWithId = async (id) => {
  const productDetails = await Product.findOne({
    where: {
      id: id,
    },
  });
  return productDetails;
};

const updateProduct = async (prod) => {
  const updatedProd = Product.update(prod, {
    where: {
      id: prod.id,
    },
  });
  return updatedProd;
};

const createProduct = async (prod) => {
  const product = await Product.create(prod);
  return product;
};

const getAllImagesByProduct = async (productId) => {
  const imagesList = await Image.findAll({
    where: {
      product_id: productId,
    },
    attributes: [
      "image_id",
      "product_id",
      "file_name",
      "date_created",
      "s3_bucket_path",
    ],
  })
  console.log(imagesList)
  return imagesList;
};

const deleteImagesInS3WithProductId = async (productId,imagesList) => {

  try {
    const promises = imagesList.map((image) => {
      return s3.deleteObject({
        Bucket: awsBucketName,
        Key: image.file_name,
      }).promise();
    });
    await Promise.all(promises);
    console.log(`Successfully deleted all images for product ID: ${productId}`);
  } catch (err) {
    console.error(`Error deleting images for product ID ${productId}: ${err}`);
  }
};



module.exports = {
    addproduct,
    getproduct,
    deleteproduct,
    updateproduct,
    patchproduct,
}