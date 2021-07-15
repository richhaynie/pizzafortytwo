// The Auth0 client, initialized in configureClient()
let auth0 = null;

/**
 * Starts the authentication flow
 */
const login = async (targetUrl) => {
  try {
    console.log("Logging in", targetUrl);

    const options = {
      redirect_uri: window.location.origin,
    };

    if (targetUrl) {
      options.appState = { targetUrl };
    }

    await auth0.loginWithRedirect(options);
  } catch (err) {
    console.log("Log in failed", err);
  }
};

/**
 * Starts the authentication flow from Sign up
 */
const signup = async (targetUrl) => {
  try {
    console.log("Signing Up", targetUrl);

    const options = {
      redirect_uri: window.location.origin,
      screen_hint: 'signup'
    };

    if (targetUrl) {
      options.appState = { targetUrl };
    }

    await auth0.loginWithRedirect(options);
  } catch (err) {
    console.log("Sign Up failed", err);
  }
};


/**
 * Executes the logout flow
 */
const logout = () => {
  try {
    console.log("Logging out");
    auth0.logout({
      returnTo: window.location.origin
    });
  } catch (err) {
    console.log("Log out failed", err);
  }
};

/**
 * Retrieves the auth configuration from the server
 */
const fetchAuthConfig = () => fetch("/auth_config.json");

/**
 * Initializes the Auth0 client
 */
const configureClient = async () => {
  const response = await fetchAuthConfig();
  const config = await response.json();

  auth0 = await createAuth0Client({
    domain: config.domain,
    client_id: config.client_id,
    audience: config.audience
  });
};

/**
 * Checks to see if the user is authenticated. If so, `fn` is executed. Otherwise, the user
 * is prompted to log in
 * @param {*} fn The function to execute if the user is logged in
 */
const requireAuth = async (fn, targetUrl) => {
  const isAuthenticated = await auth0.isAuthenticated();

  if (isAuthenticated) {
    return fn();
  }

  return login(targetUrl);
};



const orderPizza = async (data) => {
  try {
     //ASSUMPTION: Do some work here with third pary pizza ordering resulting in uuid 
    const responsePizzaFortyTwo = await fetch("/api/pizzafortytwo/order", {
      method: 'GET'
    });
    console.log('> responsePizzaFortyTwo');
    const orderData = await responsePizzaFortyTwo.json();
    console.log(orderData.orderId);
    
    
    // Get the access token from the Auth0 client
    const token = await auth0.getTokenSilently();
    console.log(token);

    
     //logged in. you can get the user profile like this:
    const user = await auth0.getUser();
    console.log(user);
    // Make the call to the API, setting the token
    // in the Authorization header
    const body = {
      user: user,
      order: orderData
    };
    console.log(body);
    const response = await fetch("/api/order", {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
     body: JSON.stringify(body)
    });

    // Fetch the JSON result
    const responseData = await response.text();
    // Display the result in the output element
    const responseElement = document.getElementById("api-call-result");
    responseElement.innerText = JSON.stringify(responseData, {}, 2);
    return responseData;

} catch (e) {
    // Display errors in the console
    console.error(e);
  }
};



const orderHistoryPizza = async () => {
  try {
     //ASSUMPTION: Do some work here with third pary pizza ordering resulting in uuid 
    const responsePizzaFortyTwo = await fetch("/api/pizzafortytwo/history", {
      method: 'GET'
    });
    const orderHistoryData = await responsePizzaFortyTwo.json();
    
    console.log('> orderHistoryData');
    console.log(orderHistoryData);
    
    return orderHistoryData;

} catch (e) {
    // Display errors in the console
    console.error(e);
  }
};

const callApi = async (data) => {
  try {


    // Get the access token from the Auth0 client
    const token = await auth0.getTokenSilently();
    console.log(token);
    // Make the call to the API, setting the token
    // in the Authorization header
    const response = await fetch("/api/order", {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      data: JSON.stringify(data) 
    });

    // Fetch the JSON result
    const responseData = await response.text();
    console.log(data);
    // Display the result in the output element
    const responseElement = document.getElementById("api-call-result");
//
    responseElement.innerText = JSON.stringify(responseData, {}, 2);

} catch (e) {
    // Display errors in the console
    console.error(e);
  }
};

// Will run when page finishes loading
window.onload = async () => {
  await configureClient();

  // If unable to parse the history hash, default to the root URL
  if (!showContentFromUrl(window.location.pathname)) {
    showContentFromUrl("/");
    window.history.replaceState({ url: "/" }, {}, "/");
  }

  const bodyElement = document.getElementsByTagName("body")[0];

  // Listen out for clicks on any hyperlink that navigates to a #/ URL
  bodyElement.addEventListener("click", (e) => {
    if (isRouteLink(e.target)) {
      const url = e.target.getAttribute("href");

      if (showContentFromUrl(url)) {
        e.preventDefault();
        window.history.pushState({ url }, {}, url);
      }
    }
  });

  const isAuthenticated = await auth0.isAuthenticated();

  if (isAuthenticated) {
    const response = await fetchAuthConfig();
  const config = await response.json();

    console.log("> User is authenticated");

    const claims = await auth0.getIdTokenClaims();
    // if you need the raw id_token, you can access it
    // using the __raw property
    console.log(claims[config.claim_usermeta]);
    console.log(claims);

    window.history.replaceState({}, document.title, window.location.pathname);
    updateUI();
    return;
  }

  console.log("> User not authenticated");

  const query = window.location.search;
  const shouldParseResult = query.includes("code=") && query.includes("state=");

  if (shouldParseResult) {
    console.log("> Parsing redirect");
    try {
      const result = await auth0.handleRedirectCallback();

      if (result.appState && result.appState.targetUrl) {
        showContentFromUrl(result.appState.targetUrl);
      }

      console.log("Logged in!");
    } catch (err) {
      console.log("Error parsing redirect:", err);
    }

    window.history.replaceState({}, document.title, "/");
  }

  
  updateUI();
};
