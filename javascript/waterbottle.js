$('.color').on('click', function(e) {
    $('#waterBottle').attr('src', 'images/water' + ($('.color').index($(e.target))) + '.jpg');
});

$('#waterOptions').change(function() {
    $("img[name=image-swap]").attr("src", $(this).val());
});