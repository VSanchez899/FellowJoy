/* Background image */
window.onload = function() {
    var screenHeight = screen.height;
    var screenWidth = screen.width;
    $("#backgroundImage").height(screenHeight);
}

var shoppingCart = document.getElementsByClassName("shoppingCart");
var shirtToCart = document.getElementById("shirtToCart");
var longSleeveToCart = document.getElementById("longSleeveToCart");
var jacketsToCart = document.getElementById("jacketsToCart");
var waterBottleToCart = document.getElementById("waterBToCart")
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






// function checkItemValue() {

// }

/* For adding shirt to the shopping cart */
function addShirt() {
    var shirtOption = document.getElementById("buyShirtGear").value;
    var shirtQty = document.getElementById("numShirtGear").value;
    if (shirtOption != "" && shirtQty != "") {
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

}

/* For adding long sleeve to shopping cart */
function addLongSleeve() {
    var longSleeveOption = document.getElementById("buyLongSleeveGear").value;
    var longSleeveQty = document.getElementById("numLongSleeveGear").value;

    if (longSleeveOption != "" && longSleeveQty != "") {
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

/* For adding water bottles to shopping cart */
function addWaterBottle() {
    /* Gets color and nubmer of water bottles */
    var waterBottleOption = document.getElementById("buyWaterBGear").value;
    var waterBottleQty = document.getElementById("numWaterBGear").value;

    /* Checks to make sure there is a value in color and a qty */
    if (waterBottleOption != "" && waterBottleQty != "") {
        itemNum++;
        var waterBottle = [];
        /* Gets Information about water bottle choosen */
        var waterBottleColor = document.getElementById("buyWaterBGear").value
        var waterBottleSizePrice = document.getElementById("WaterBSizeGear").value
        var numWaterBottles = document.getElementById("numWaterBGear").value
        var waterBottleSize = waterBottleSizePrice.split(" ")[0];
        var pricePerWaterBottle = waterBottleSizePrice.split(" ")[1];
        var waterBottleItemTotal = 0;
        /* Gets total price for that set of water bottles */
        waterBottleItemTotal = parseInt(pricePerWaterBottle) * parseInt(numWaterBottles);

        /* Pushes all water bottles info into an array so it can be locally stored */
        waterBottle.push("water bottle", waterBottleColor, waterBottleSize + "oz", "$" + pricePerWaterBottle, numWaterBottles, waterBottleItemTotal);

        /* puts the array of water bottle info in local storage with an incremented value so it different for each item */
        localStorage.setItem("item" + itemNum, waterBottle);


        shoppingCartArray["item" + itemNum] = waterBottle;
        shoppingCart.innerHTML += shoppingCartArray["item" + itemNum];

        console.log(shoppingCartArray)
    }
}

var num = 1;
var itemTotal = 1;
var priceTotal = 1;

/* Sets up Cart when page loads */
window.onload = function setUpCart() {
    // console.log(localStorage.length);

    /* Runs while num is less then or equal to the local storage length */
    while (num <= localStorage.length) {
        // console.log("num" + num)

        /* Builds new row for item by getting the information from local storage */
        document.getElementById("shoppingCart").innerHTML += "<tr>" + "<th scope='row' id='th'>" + localStorage.getItem("item" + num).split(",")[0] + "</th>" + "<td>" + localStorage.getItem("item" + num).split(",")[1] + "</td>" + "<td>" + localStorage.getItem("item" + num).split(",")[2] + "</td>" + "<td>" + localStorage.getItem("item" + num).split(",")[3] + "</td>" + "<td>" + localStorage.getItem("item" + num).split(",")[4] + "</td>" + "<td>" + localStorage.getItem("item" + num).split(",")[5] + "</td>" + "</tr>";

        /* Checks if num is equal to the local storage length */
        if (num >= localStorage.length) {
            var numItemsArray = [];
            var numItems = 0;

            /* Gets the number of items for each "big" item */
            while (itemTotal <= num) {
                numItemsArray.push(parseInt(localStorage.getItem("item" + itemTotal).split(",")[4]));
                itemTotal++;
            }
            numItems = numItemsArray.reduce(getSum);

            /* Builds a row after all the item rows have been built for total number of items and total price */
            document.getElementById("shoppingCart").innerHTML += "<tr>" + "<th>" + "</th>" + "<th>" + "</th>" + "<th>" + "</th>" + "<th>" + "</th>" + "<th id='th'>" + "(" + numItems + " items)" + " Total:" + "</th>" + "<td id='total'>" + "</td>" + "</tr>"

            var total = document.getElementById("total"); //This id is put in right above^
            var endTotal = [];

            /* Gets all the price totals of the item rows and puts them in an array */
            while (priceTotal <= num) {
                endTotal.push(parseInt(localStorage.getItem("item" + priceTotal).split(",")[5]));
                priceTotal++;
            }

            /* Mini funciton to add all the item totals to get one big total */
            function getSum(num1, num2) {
                return num1 + num2;
            }

            // console.log(numItemsArray)
            // console.log(endTotal)

            /* Writes the whole total to the webpage */
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
waterBottleToCart.addEventListener("click", addWaterBottle);