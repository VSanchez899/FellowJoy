$('.shirtColor').on('click', function(e) {
    $('#shirt').attr('src', 'images/shirtLong' + ($('.shirtColor').index($(e.target))) + '.jpg');
});