const express = require("express");
const axios = require("axios");
const fetch = require("node-fetch");
const { join } = require("path");
const morgan = require("morgan");
const helmet = require("helmet");

const app = express();
app.use(morgan("dev"));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const jwt = require("express-jwt");
const jwtAuthz = require('express-jwt-authz');
const jwksRsa = require("jwks-rsa");
const authConfig = require("./auth_config.json");

const checkScopes = jwtAuthz(['profile']);

app.use(express.static(join(__dirname, "public")));

/**
 * Create JWT Middleware for authentication
 */
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${authConfig.domain}/.well-known/jwks.json`
  }),

  audience: authConfig.audience,
  issuer: `https://${authConfig.domain}/`,
  algorithms: ["RS256"]
});


/**
 * Returns Config for client side js
 */
app.get("/auth_config.json", (req, res) => {
  res.sendFile(join(__dirname, "auth_config.json"));
});

/**
 * Assumed to be an external Pizza Ordering system from Third Party.  Results in order ID.
 */
 app.get("/api/pizzafortytwo/order", (req, res) => {
  const {v4 : uuidv4} = require('uuid');
  res.json({
    orderId:  uuidv4()
  });
});

/**
 * Assumed to be an external Pizza Ordering system from Third Party.  Results in order history.
 */
 app.get("/api/pizzafortytwo/history", (req, res) => {
   try {
    res.json({
      last_order_date: new Date().toString(),
      last_order_description: ['12" Pepperoni Pizza', 'Breadsticks', '10" Supreme Pizza'],
    });
     
   } catch (error) {
     console.log(error);s
   }
 
});

/**
 * Saves Order to User Meta Data in Auth0
 */
app.post("/api/order", checkJwt, checkScopes, async (reqst, respns) => {

  var auth0_user_id = reqst.body.user.sub;
  var pizza_order_id =  reqst.body.order.orderId;

  // Get a Token for Adding User Meta Data
    var response = await fetch(`https://${authConfig.domain}/oauth/token`, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: '{"client_id":"RKpGRYvkZ4J402sU9w9PRdVP8uphESYZ","client_secret":"x0Quh7L6dVoM3A_g47PfDw9yKeangd5nabE79Q2nd0El_dAgfkhJ4b7BCovYnZVU","audience":"https://pizzafortytwo.us.auth0.com/api/v2/","grant_type":"client_credentials"}' 
    });
    json_response = await response.json();
    
   // Add to the User
    var options = {
      method: 'PATCH',
      url: `https://${authConfig.domain}/api/v2/users/${auth0_user_id}`,
      headers: {authorization: "Bearer " + json_response.access_token, 'content-type': 'application/json'},
      data: {
        user_metadata: {last_pizza_order_id: pizza_order_id}
      }
    };
    
    axios.request(options).then(function (response) {
      console.log(response.data);
    }).catch(function (error) {
      console.error(error);
    });
    
    respns.json({
         message: `Success. Recorded Pizza Order user: ${reqst.body.user.sub} order ${reqst.body.order.orderId}`
      });
});


  app.get("/*", (_, res) => {
    res.sendFile(join(__dirname, "index.html"));
  });
  
  module.exports = app;

// app.get('/api/public', function(req, res) {
//   res.json({
//     message: 'Hello from a public endpoint! You don\'t need to be authenticated to see this.'
//   });
// });

// app.get('/api/private', checkJwt, function(req, res) {
//   res.json({
//     message: 'Hello from a private endpoint! You need to be authenticated to see this.'
//   });
// });

// app.get('/api/private-scoped', checkJwt, checkScopes, function(req, res) {
//   res.json({
//     message: 'Hello from a private endpoint! You need to be authenticated and have a scope of read:messages to see this.'
//   });
// });

