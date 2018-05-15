window.onload = function() {
    var neededHeight = $(".shortsleeve").height();
    $(".jacket").height(neededHeight);
    $(".waterBottle").height(neededHeight);
}

window.onresize = function() {
    var neededHeight = $(".shortsleeve").height();
    $(".jacket").height(neededHeight);
    $(".waterBottle").height(neededHeight);
}