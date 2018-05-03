var shoppingCart = document.getElementById("shoppingCart");
var shirtToCart = document.getElementById("shirtToCart");
var longSleeveToCart = document.getElementById("longSleeveToCart");
var jacketsToCart = document.getElementById("jacketsToCart");
var clearShoppingCart = document.getElementById("clearCart");
var shoppingCartArray = {};

var itemNum = 0;

// var shirtValSplit = document.getElementById("shirtSizeGear");

// shirtValSplit.onchange = function splitValues() {
//     var shirtValSplit = document.getElementById("shirtSizeGear");
//     console.log(shirtValSplit.value);
//     shirtValSplit = shirtValSplit.value;
//     console.log(shirtValSplit.split(" "))
// }


/* For adding shirt to the shopping cart */
function addShirt() {
    itemNum++;
    var shirt = [];
    var shirtColor = document.getElementById("buyShirtGear").value
    var shirtSize = document.getElementById("shirtSizeGear").value
    var numShirts = document.getElementById("numShirtGear").value
    console.log(shirtSize)
    shirt.push("shirt", shirtColor, shirtSize, numShirts);
    // shirt.push("size: " + shirtSize);
    // shirt.push("qty: " + numShirts);
    localStorage.setItem("item" + itemNum, shirt);
    shoppingCartArray["item" + itemNum] = shirt;


    // shoppingCart.innerHTML += "<ul>" + "<li>" + shirt[0] + "</li>" + "<li>" + shirt[1] + "</li>" + "<li>" + shirt[2] + "</li>" + "</ul>";

    shoppingCart.innerHTML += shoppingCartArray["item" + itemNum];

    // console.log(shirt[0]);
    console.log(shoppingCartArray)
}

/* For adding long sleeve to shopping cart */
function addLongSleeve() {
    itemNum++;
    var longSleeve = [];
    var longSleeveColor = document.getElementById("buyLongSleeveGear").value
    var longSleeveSize = document.getElementById("longSleeveSizeGear").value
    var numLongSleeves = document.getElementById("numLongSleeveGear").value
    longSleeve.push("long sleeve", longSleeveColor, longSleeveSize, numLongSleeves);
    localStorage.setItem("item" + itemNum, longSleeve);
    shoppingCartArray["item" + itemNum] = longSleeve;
    shoppingCart.innerHTML += shoppingCartArray["item" + itemNum];
}

/* For adding jackets/hoodies to shopping cart */
function addJacket() {
    itemNum++;
    var jackets = [];
    var jacketColor = document.getElementById("buyLongSleeveGear").value
    var jacketSize = document.getElementById("longSleeveSizeGear").value
    var numJackets = document.getElementById("numLongSleeveGear").value
    jackets.push("long sleeve", jacketColor, jacketSize, numJackets);
    localStorage.setItem("item" + itemNum, jackets);
    shoppingCartArray["item" + itemNum] = jackets;
    shoppingCart.innerHTML += shoppingCartArray["item" + itemNum];
}

var num = 1;

function setUpCart() {
    console.log(localStorage.length)
        //"<table>" + "<th>" + "<td>" +  "</th>" + "</table>"
    while (num <= localStorage.length) {
        console.log("num" + num)
        document.getElementById("shoppingCart").innerHTML += "<tr>" + "<th scope='row'>" + localStorage.getItem("item" + num).split(",")[0] + "</th>" + "<td>" + localStorage.getItem("item" + num).split(",")[1] + "</td>" + "<td>" + localStorage.getItem("item" + num).split(",")[2] + "</td>" + "<td>" + localStorage.getItem("item" + num).split(",")[3] + "</td>" + "</tr>"
        num++;
    }

    // document.getElementById("shoppingCart").innerHTML = "<tr>" + "<th scope='row'>" + localStorage.getItem("item1").split(",")[0] + "</th>" + "<td>" + localStorage.getItem("item1").split(",")[1] + "</td>" + "<td>" + localStorage.getItem("item1").split(",")[2] + "</td>" + "<td>" + localStorage.getItem("item1").split(",")[3] + "</td>" + "</tr>"

    //localStorage.getItem("item" + num);
    console.log(localStorage.getItem("shirtOne"))
        // localStorage.clear();
}

/* Clears Shopping Cart */
// function clearCartFunction() {
//     localStorage.clear();
// }
// clearShoppingCart.addEventListener("click", clearCartFunction);

shirtToCart.addEventListener("click", addShirt);
longSleeveToCart.addEventListener("click", addLongSleeve);
jacketsToCart.addEventListener("click", addJacket);