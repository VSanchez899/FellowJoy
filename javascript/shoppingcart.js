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
    var shirtSizePrice = document.getElementById("shirtSizeGear").value
    var numShirts = document.getElementById("numShirtGear").value
    var shirtSize = shirtSizePrice.split(" ")[0];
    var pricePerShirt = shirtSizePrice.split(" ")[1];
    var shirtItemTotal = 0;
    console.log(shirtSize);
    console.log(pricePerShirt);

    shirtItemTotal = parseInt(pricePerShirt) * parseInt(numShirts);

    shirt.push("shirt", shirtColor, shirtSize, "$" + pricePerShirt, numShirts, shirtItemTotal);
    console.log(shirt)
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
    var longSleeveSizePrice = document.getElementById("longSleeveSizeGear").value
    var numLongSleeves = document.getElementById("numLongSleeveGear").value
    var longSleeveSize = longSleeveSizePrice.split(" ")[0];
    var pricePerLongSleeve = longSleeveSizePrice.split(" ")[1];
    var longSleeveItemTotal = 0;

    longSleeveItemTotal = parseInt(pricePerLongSleeve) * parseInt(numLongSleeves);

    console.log(pricePerLongSleeve, longSleeveItemTotal);
    longSleeve.push("long sleeve", longSleeveColor, longSleeveSize, "$" + pricePerLongSleeve, numLongSleeves, longSleeveItemTotal);
    localStorage.setItem("item" + itemNum, longSleeve);
    shoppingCartArray["item" + itemNum] = longSleeve;
    shoppingCart.innerHTML += shoppingCartArray["item" + itemNum];
}

/* For adding jackets/hoodies to shopping cart */
function addJacket() {
    itemNum++;
    var jackets = [];
    var jacketColor = document.getElementById("buyHoodieGear").value
    var jacketSizePrice = document.getElementById("hoodieSizeGear").value
    var numJackets = document.getElementById("numHoodieGear").value
    var jacketSize = jacketSizePrice.split(" ")[0];
    var pricePerJacket = jacketSizePrice.split(" ")[1];
    var jacketItemTotal = 0;

    jacketItemTotal = parseInt(pricePerJacket) * parseInt(numJackets);


    jackets.push("jacket", jacketColor, jacketSize, "$" + pricePerJacket, numJackets, jacketItemTotal);
    localStorage.setItem("item" + itemNum, jackets);
    shoppingCartArray["item" + itemNum] = jackets;
    shoppingCart.innerHTML += shoppingCartArray["item" + itemNum];

    console.log(shoppingCartArray)
}

var num = 1;
var itemTotal = 1;
var priceTotal = 1;

function setUpCart() {
    console.log(localStorage.length);
    while (num <= localStorage.length) {
        console.log("num" + num)
        document.getElementById("shoppingCart").innerHTML += "<tr>" + "<th scope='row'>" + localStorage.getItem("item" + num).split(",")[0] + "</th>" + "<td>" + localStorage.getItem("item" + num).split(",")[1] + "</td>" + "<td>" + localStorage.getItem("item" + num).split(",")[2] + "</td>" + "<td>" + localStorage.getItem("item" + num).split(",")[3] + "</td>" + "<td>" + localStorage.getItem("item" + num).split(",")[4] + "</td>" + "<td>" + localStorage.getItem("item" + num).split(",")[5] + "</td>" + "</tr>";

        if (num >= localStorage.length) {
            var numItemsArray = [];
            var numItems = 0;

            while (itemTotal <= num) {
                numItemsArray.push(parseInt(localStorage.getItem("item" + itemTotal).split(",")[4]));
                itemTotal++;
            }
            numItems = numItemsArray.reduce(getSum);

            document.getElementById("shoppingCart").innerHTML += "<tr>" + "<th>" + "</th>" + "<th>" + "</th>" + "<th>" + "</th>" + "<th>" + "</th>" + "<th>" + "(" + numItems + " items)" + " Total:" + "</th>" + "<td id='total'>" + "</td>" + "</tr>"
            var total = document.getElementById("total");
            var endTotal = [];
            while (priceTotal <= num) {
                endTotal.push(parseInt(localStorage.getItem("item" + priceTotal).split(",")[5]));
                priceTotal++;
            }

            function getSum(num1, num2) {
                return num1 + num2;
            }

            console.log(numItemsArray)
            console.log(endTotal)

            total.innerHTML = "$" + endTotal.reduce(getSum);

        }
        num++;
    }


    // document.getElementById("shoppingCart").innerHTML = "<tr>" + "<th scope='row'>" + localStorage.getItem("item1").split(",")[0] + "</th>" + "<td>" + localStorage.getItem("item1").split(",")[1] + "</td>" + "<td>" + localStorage.getItem("item1").split(",")[2] + "</td>" + "<td>" + localStorage.getItem("item1").split(",")[3] + "</td>" + "</tr>"

    //localStorage.getItem("item" + num);
    console.log(localStorage.getItem("shirtOne"))
        // localStorage.clear();
}

/* Clears Shopping Cart */
// function clearCartFunction() {
// localStorage.clear();
// }
// clearShoppingCart.addEventListener("click", clearCartFunction);

shirtToCart.addEventListener("click", addShirt);
longSleeveToCart.addEventListener("click", addLongSleeve);
jacketsToCart.addEventListener("click", addJacket);