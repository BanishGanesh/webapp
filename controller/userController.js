const db = require('../model')
const bcrypt = require("bcrypt");
const { users } = require('../model');
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

const User = db.users

let isEmail = (email) => {
    var emailFormat = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (email.match(emailFormat)) {
        return true;
    }
    return false;
};

//Password Regex : min 8 letter password, with at least a symbol, upper and lower case letters and a number
let checkPassword = (str) => {
    var passRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/;
    console.log(str)
    return str.match(passRegex);
};

//Name Validation
let checkName = (str) => {
    var regName = /^[a-zA-Z]+$/;
    return str != "" && str.match(regName);
};

let encryptedPassword = (password) => {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};

const adduser = async (req, res) => {
    statsdClient.increment('POST.adduser.count');
    logger.log('info','Request received endpoint has been hit for adduser API');
    const allowedParams = ["first_name", "last_name", "password", "username"];
    const receivedParams = Object.keys(req.body);
    const unwantedParams = receivedParams.filter(
        (param) => !allowedParams.includes(param)
    );
    const notReceivedParams = allowedParams.filter((param) =>
        !receivedParams.includes(param)
    );
    console.log(notReceivedParams);
    console.log(allowedParams);
    console.log(unwantedParams);
    console.log(receivedParams);
    if (unwantedParams.length) {
        res
            .status(400)
            .send({
                error: `The following parameters are not allowed: ${unwantedParams.join(
                    ", "
                )}`,
            });
            logger.error('The following parameters are not allowed');
    }
    else if (notReceivedParams.length) {
        res
            .status(400)
            .send({
                error: `The following required parameters are not received: ${notReceivedParams.join(
                    ", "
                )}`,
            });
            logger.error('The following required parameters are not received');
    }
    else {
        const firstName = req.body.first_name;
        const lastName = req.body.last_name;
        const email = req.body.username;
        const password = req.body.password;

        console.log(email);

        if (firstName == null) {

            res.status(400).send("Please enter firstname");
            logger.error('Please enter firstname');
        }
        else if (lastName == null) {

            res.status(400).send("Please enter lastname");
            logger.error('Please enter lastname');
        }
        else if (email == null) {

            res.status(400).send("Please enter username");
            logger.inerrorfo('Please enter username');
        }
        else if (password == null) {

            res.status(400).send("Please enter Password");
            logger.error('Please enter Password');
        }
        else if (!isEmail(email)) res.status(400).send("Please enter valid email");
        else if (!checkPassword(password))
            res.status(400).send("Please enter valid password");
        else if (!(checkName(firstName) && checkName(lastName)))
            res.status(400).send("Please enter valid First and Last Names");
        else {
            const hashedPassword = encryptedPassword(password);
            console.log(hashedPassword);
            let suser = await User.findOne({ where: { username: email } })
            if (!suser) {
                let info = {
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    username: req.body.username,
                    password: hashedPassword
                }

                const user = await User.create(info)
                // res.send(user)
                //res.status(200)
                let s1user = await User.findOne({ where: { username: email } })
                res.status(201).send(
                    {
                        "id": s1user.id,
                        "firstname": s1user.first_name,
                        "lastname": s1user.last_name,
                        "username": s1user.username,
                        "account_created": s1user.account_created,
                        "account_updated": s1user.account_modified
                    }
                );

            }
            else {
                res.status(400).send("email already exists");
                logger.error('email already exists');
            }

        }
    }

}

const getuser = async (req, res) => {
    statsdClient.increment('GET.getuser.count');
    logger.log('info','Request received endpoint has been hit for getuser API');
    const userId = req.params.userId;
    let authheader = req.headers.authorization;
    if (!authheader) {

        res.status(401).send("basic authentication not present");

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
            if (suser == null) {
                console.log("------> User Not Found");
                res.status("Authentication Failed ,Username/password wrong").sendStatus(401);
                logger.error('Authentication Failed ,Username/password wrong');
            }

            else {
                bcrypt.compare(password, suser.password, (err, resu) => {
                    if (err) throw err;
                    console.log(resu);
                    if (resu && userId == suser.id) {
                        console.log("Authentication Successful");
                        logger.error('Authentication Successful');
                        console.log(resu);
                        res.status(200).send({
                            id: suser.id,
                            first_name: suser.first_name,
                            last_name: suser.last_name,
                            username: suser.username,
                            account_created: suser.account_created,
                            account_updated: suser.account_updated
                        });
                    }
                    else if(userId != suser.id){
                        res.status("Forbidden").sendStatus(403);
                        logger.error('Forbidden');
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

const updateuser = async (req, res) => {
    statsdClient.increment('UPDATE.updateuser.count');
    logger.log('info','Request received endpoint has been hit for updateuser API');
    const allowedParams = ["first_name", "last_name", "password"];
    const receivedParams = Object.keys(req.body);
    const unwantedParams = receivedParams.filter(
        (param) => !allowedParams.includes(param)
    );
    // const notReceivedParams = allowedParams.filter((param) =>
    //     !receivedParams.includes(param)
    // );
    // console.log(notReceivedParams);
    console.log(allowedParams);
    console.log(unwantedParams);
    console.log(receivedParams);
    if (unwantedParams.length) {
        res
            .status(400)
            .send({
                error: `The following parameters are not allowed: ${unwantedParams.join(
                    ", "
                )}`,
            });
    }
    // else if (notReceivedParams.length) {
    //     res
    //         .status(400)
    //         .send({
    //             error: `The following required parameters are not received: ${notReceivedParams.join(
    //                 ", "
    //             )}`,
    //         });
    // }
    else {
        let userId = req.params.userId
        console.log("userid:" + userId);
        var firstName = req.body.first_name;
        var lastName = req.body.last_name;
        var passwordBody = req.body.password;
        var hashedPassword;

        let authheader = req.headers.authorization;
        if (!authheader) {
            res.status(400).send("basic authentication not present");
            logger.error("basic authentication not present");
        }
        else {
            var auth = new Buffer.from(authheader.split(" ")[1], "base64")
                .toString()
                .split(":");
            var username = auth[0];
            var password = auth[1];
            if (!isEmail(username)) { res.status(401).send("Bad request - Enter Valid email"); }
            else {
                let suser =  await User.findOne({ where: { username: username } })
                if (suser == null) {
                    console.log("->User not found");
                    res.status(401).send("Authentication failed");
                    logger.error("Authentication failed");
                }

                else {
                    bcrypt.compare(password, suser.password, (err, resu) => {
                        if (err) throw err;
                        if (firstName == null || firstName == "")
                            firstName = suser.first_name;
                        if (lastName == null || lastName == "")
                            lastName = suser.last_name;
                        if (passwordBody == null || passwordBody == "") {
                            hashedPassword = suser.password;
                        }
                        else {
                            var hashedPassword = encryptedPassword(req.body.password);
                        }
                        if (resu && userId == suser.id) {
                            console.log("Authentication Successful");
                            logger.info("Authentication Successful");
                            let upinfo = {
                                first_name: firstName,
                                last_name: lastName,
                                password: hashedPassword
                            }
                            if (
                                passwordBody != null &&
                                passwordBody != "" &&
                                !checkPassword(passwordBody)
                            )
                                res.status(400).send("Please enter valid password");
                            else if (!(checkName(firstName) && checkName(lastName)))
                                res.status(400).send("Please enter valid First and Last Names");
                            else {
                                const user = User.update(upinfo, { where: { id: userId } })
                                res.status(204).send(user);

                            }
                        }
                        else if(userId != suser.id){
                            res.status("Forbidden").sendStatus(403);
                            logger.warn("Forbidden");
                          }
                        else {
                            console.log("Authorization Failed");
                            res.status(401).send("Unauthorized");
                            logger.error("Unauthorized");
                        }



                    });
                }


            }
        }
    }


}

module.exports = {
    adduser,
    updateuser,
    getuser
}