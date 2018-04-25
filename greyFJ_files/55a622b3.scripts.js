'use strict';

angular.module('designstudioApp.services', [])
  .provider('User', [function () {
    var user = {};
    var email = '';
    var sessionId = null;
    var loginType = 'site';
    var isCheckingUser = false;
    var cart = {
      designs: [],
      quantity: 0,
      promo: {
        code: ''
      }
    };

    function setUser(user) {
      user = user;
      email = user.email || '';
      sessionId = user.sessionId || null;
    }

    function User($http, APIService) {
      this.getEmail = function getEmail() {
        return email;
      };

      this.getSessionId = function getSessionId() {
        return sessionId;
      };

      this.isLoggedIn = function isLoggedIn() {
        return email.length > 0;
      };

      this.checkUser = function checkUser(url) {
        if (this.getEmail() === '' && isCheckingUser === false) {
          isCheckingUser = true;
          url = (typeof url === 'undefined' ? 'user/user.php' : url);
          return $http.get(url).success(function (data) {
            setUser(data);
            isCheckingUser = false;
          });
        }
      };

      this.login = function login(emailAddress) {
        return $http.post('user/login.php/', {
          email: emailAddress
        }).success(function (data) {
          email = data.email;
        }).error(function () {
          email = '';
        });
      };

      this.checkoutSocialLogin = function (socialData) {
        return $http.post('user/login.php/', socialData).success(function (response) {
          email = (response.success) ? socialData.email : '';
          loginType = socialData.type;
        }).error(function () {
          email = '';
        });
      };

      this.logout = function logout() {
        email = '';
        return $http.get('user/logout.php');
      };

      this.getDesigns = function getDesigns() {
        return APIService.getDesignsByEmail(email);
      };

      this.getCart = function getCart() {
        return $http.get('user/cart.php', {cache: true}).success(function (data) {
          cart = data;
        });
      };

      this.getCartQuantity = function getCartQuantity() {
        return cart.quantity;
      }

      this.hasCartPromo = function hasCartPromo() {
        return (
          typeof cart.promo !== 'undefined' &&
          typeof cart.promo.code !== 'undefined' &&
          cart.promo.code.length > 0
        );
      }

      this.getCartPromo = function getCartPromo() {
        return cart.promo;
      }

      this.setCartPromo = function setCartPromo(code) {
        return $http.post('user/applypromo.php', {code: code}).success(onApply);

        function onApply(data) {
          cart.promo.code = data.code;
        }
      }

      this.getLoginType = function getLoginType() {
        return loginType;
      }
    }

    this.$get = ["$http", "APIService", function $get($http, APIService) {
      return new User($http, APIService);
    }];
  }]
);

'use strict';

angular.module('designstudioApp.services')
  .provider('StudioMode', [function () {
    var currentMode;

    function StudioMode() {
      this.isCheckout = function () {
        return currentMode === 'checkout';
      }
    }

    function getMode (hostname) {
      return 'checkout';
    }

    this.getFacebookKey = function (hostname) {
      return '1621993888085371';
    };

    this.getTemplate = function getTemplate(hostname) {
        return 'views/main-checkout.html?ts=' + Date.now();
    };

    this.$get = ["$window", function $get($window) {
      return new StudioMode();
    }];
  }]
);

'use strict';

if(window.location.search.length > 0) {
  window.location = window.location.origin + window.location.pathname + '#/' + window.location.search;
}
angular.module('designstudioApp', [
  'ngResource',
  'ngSanitize',
  'ngAnimate',
  'ngTouch',
  'ngRoute',
  'ngDragDrop',
  'designstudioAppFilters',
  'LocalStorageModule',
  'ui.bootstrap',
  'angulartics',
  'angulartics.segment',
  'angulartics.google.tagmanager',
  'designstudioApp.services',
  'dialogs.main',
  'algoliasearch',
  'ngFileUpload',
  'rzModule'
]).config(["$routeProvider", "$uibTooltipProvider", "StudioModeProvider", "$analyticsProvider", function ($routeProvider, $uibTooltipProvider, StudioModeProvider, $analyticsProvider) {
  $routeProvider
    .when('/', {
      templateUrl: StudioModeProvider.getTemplate(window.location.hostname),
      controller: 'MainCtrl',
      reloadOnSearch: false
    })
    .otherwise({
      redirectTo: '/'
    });

  $analyticsProvider.virtualPageviews(false);
}]);

'use strict';

angular.module('designstudioApp')
  .controller('MainCtrl', ['$rootScope', '$scope', '$routeParams', '$location', '$window', '$document', '$timeout', 'Design', 'Help', 'User', 'StudioMode', 'Tracking', 'Branding', 'Viewport', 'ReminderModal', 'Promo', '$analytics', 'LocalDesign', 'dialogs', 'config', 'IP', 'CheckoutModal', 'QuantitiesModal', 'PrintArea', 'PrintObject', 'OrderWarnModal', 'DesignHistory', 'AskForQuantity', 'StartUp', 'UploadModal',
  function ($rootScope, $scope, $routeParams, $location, $window, $document, $timeout, Design, Help, User, StudioMode, Tracking, Branding, Viewport, ReminderModal, Promo, $analytics, LocalDesign, dialogs, config, IP, CheckoutModal, QuantitiesModal, PrintArea, PrintObject, OrderWarnModal, DesignHistory, AskForQuantity, StartUp, UploadModal) {
    var itemId = $routeParams.item;
    var colorId = $routeParams.color;
    var designId = $routeParams.design;
    var promoCode = $routeParams.promo;
    var methodCode = $routeParams.method;
    var action = $routeParams.action;
    var askQuantity = $routeParams.askQuantity;
    var startUp = $routeParams.startUp;
    var loadLastUnsavedDesign = $routeParams.lastDesign;
    var loaded = false;
    var clipart = {};

    if (!loadLastUnsavedDesign) {
      AskForQuantity.setIsAsking(askQuantity, itemId, methodCode);
    }

    $scope.isAskingQuantity = AskForQuantity.isAsking;
    $scope.isLoading = true;
    $scope.Design = Design;
    $scope.Viewport = Viewport;

    if (angular.isDefined($routeParams.clipartId) && angular.isDefined($routeParams.clipartName)) {
      clipart.id = $routeParams.clipartId;
      clipart.name = $routeParams.clipartName;
    }

    AskForQuantity.setTitleIfNotAsking(itemId);

    User.getCart().then(function (response) {
      var promo = User.getCartPromo();

      if (angular.isDefined(promoCode) && (User.hasCartPromo() === false || promo.code != promoCode)) {
        Promo.apply(promoCode);
      }
    });

    if (angular.isDefined(designId)) {
      if (isNaN(parseInt(designId, 10)) === true) {
        designId = designId.replace(/=/g, '');
        designId = $window.atob(designId);
      }
      Design.read(designId);
    } else if(AskForQuantity.isAbleToAsk(itemId, methodCode)) {
      AskForQuantity.ask(itemId, colorId, methodCode);
    } else {
      $scope.isLoading = false;
      $rootScope.$broadcast('printAreaSet', Math.random());
    }

    $scope.shouldShowPromoBanner = User.hasCartPromo;

    function designLoaded(design) {
      if (design.hasActiveOrder) {
        OrderWarnModal.open();
      }

      $scope.isLoading = false;

      // var printObject = {"id":null,"x":120,"y":160,"scaleX":1,"scaleY":1,"zIndex":0,"rotation":0,"type":"uploadobject","uid":"printObject-1","details":{"clipping":"ffffff","multiColor":"0","inkColor":{"name":"Black","hex":"000000","code":"2","sizes":"","id":"3","hsv":null,"pantoneColorId":null,"isFree":false},"inkColorId":"3","inkColors":[],"clippings":[],"swappings":[],"uploadFileId":"76","uploadFile":{"id":"76","fileName": '',"origName":"f2f21c0313ee4318d6f13f6c9eb53f82.jpg","origExt":".jpg"}},"outline":{"size":"0","color":{"name":"Red","hex":"EF0012","code":"38","sizes":"","id":"38","hsv":null,"pantoneColorId":null,"isFree":false},"inkColorId":"38","type":4},"threshold":{"size":0,"type":6}};

      // var whiteBG3Ink = 'f2f21c0313ee4318d6f13f6c9eb53f82';
      // var transBG4Ink = 'c2077b800a66b609bb6730a51dd503ac';
      // var pinkBG4Ink = 'c8b8116ca924f61426b39ee3869c8de8';
      // var photo7Ink = '9dfb5e2534c27f083848f7e74faded82';
      // var mostlyWhiteBG2Ink = '72b861fce78ce405d327430df66e14d4';
      // var photo10Ink = '1a662330c6e2c7b337c60cb913b628f2';

      // printObject.details.uploadFile.fileName = photo10Ink;
      // UploadModal.open(printObject);

      $analytics.pageTrack($location.url());

      Tracking.save();

      $scope.isEmbroidery = Design.getPrintMethodCode() === 'emb';

      if (loaded === false && action === 'editquantites') {
        checkout();
      }

      if (loaded === false) {
        if (angular.isDefined(startUp)) {
          StartUp.init(startUp);
        }

          loaded = true;

          if (IP.isCorporate() === false) {
            localDesignCheck(design);
          } else {
            addClipart(clipart);
          }

          DesignHistory.init();
      }
    }

    function localDesignCheck(design) {
      var dlg, local;

      local = LocalDesign.get(design.id);

      if (!local.designItems || design.id) {
        addClipart(clipart);

        return false;
      }

      $analytics.eventTrack('local design - exists', {category: 'design studio'});

      if (loadLastUnsavedDesign) {
        Design.readLocal();
        $analytics.eventTrack('loaded - last local design - yes', {category: 'design studio'});
      } else {
        dlg = dialogs.confirm('We Saved Your Work', 'Would you like to continue from where you left off?', {
          size: 'md'
        });

        dlg.result.then(function () {
          Design.readLocal();
          $analytics.eventTrack('clicked - local design - yes', {category: 'design studio'});
        }, function () {
          $analytics.eventTrack('clicked - local design - no', {category: 'design studio'});
        }).then(function () {
          addClipart(clipart);
        });
      }
    }

    function addClipart(clipart) {
      var printObject;
      var template;

      if (angular.isUndefined(clipart.id)) {
        return false;
      }

      template = PrintArea.getPrintObjectTemplate();

      template.clipartId = clipart.id;
      template.clipartSrc = clipart.name;

      printObject = PrintObject.createClipartObject(template);

      PrintArea.addPrintObject(printObject);
    }

    $scope.$on('designLoadSuccess', function (event, design) {
      if (angular.isDefined(design.id) && design.id !== null) {
        $location.url('/?design=' + $window.btoa(design.id).replace(/=/g, ''), true);
      } else {
        if (angular.isDefined(methodCode)) {
          $location.url('/?method=' + methodCode);
        } else {
          $location.url('/');
        }
      }
    });

    $scope.$on('designLoaded', function (event, design) {
      designLoaded(design);
    });

    $scope.$on('printAreaSet', function () {
      $scope.isEmbroidery = Design.getPrintMethodCode() === 'emb';
    });

    $scope.$on('printMethodSet', function () {
      $scope.isEmbroidery = Design.getPrintMethodCode() === 'emb';
    });

    $window.onbeforeunload = function () {
      if (Design.isDirty() === true) {
        return "If you continue you will lose any unsaved changes.\nPlease save your design with your email address.";
      }
    };

    $window.onunload = function () {
      var design;

      if (Design.isDirty() === true && !Design.data.id) {
        design = angular.copy(Design.data);
        design = Design.transformForSave(design);
        LocalDesign.set(design);
      }
    };

    User.checkUser().then(function () {
      if (Viewport.isExtraSmall() && User.isLoggedIn() === false && angular.isUndefined(promoCode)) {
        if (!AskForQuantity.isAsking()) {
          ReminderModal.open();
        }
      }
    });

    function checkout() {
      if (Design.hasMinQuantity() && Design.isLowVolume() === false) {
        CheckoutModal.open();
      } else {
        QuantitiesModal.open();
      }
    }
  }
]);

'use strict';

angular.module('designstudioApp')
  .directive('menuMain', [function () {
    return {
      templateUrl: 'views/menu/main.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: false,
      link: function postLink(scope, element, attrs) {

      }
    };
  }
]);

'use strict';

angular.module('designstudioApp')
  .directive('menu', ['$timeout', function ($timeout) {
    return {
      templateUrl: 'views/menu/menu.html?ts='+Date.now(),
      restrict: 'E',
      scope: true, //this should be switched to isolate scope when finished transition to directive controller
      replace: true,
      controller: ['$scope', function ($scope) {
        this.data = $scope.data;
        this.setActive = $scope.setActive;
        this.setAdvance = $scope.setAdvance;
      }],
      link: function postLink(scope, element, attrs) {
        var resizeTimeOutId;

        scope.menu = {
          height: 0
        };

        element.find('.main-menu-toolbar-row').hover(function () {
          $('.main-menu-intro-row').eq($(this).index()).addClass('hover');
        }, function () {
          $('.main-menu-intro-row').eq($(this).index()).removeClass('hover');
        });

        element.find('.main-menu-intro-row').hover(function () {
          $('.main-menu-toolbar-row').eq($(this).index()).addClass('hover');
        }, function () {
          $('.main-menu-toolbar-row').eq($(this).index()).removeClass('hover');
        });

        element.find('.main-menu-intro-row').mousedown(function () {
          $('.main-menu-toolbar-row').eq($(this).index()).addClass('active');
        });

        element.find('.main-menu-intro-row').mouseup(function () {
          $('.main-menu-toolbar-row').eq($(this).index()).removeClass('active');
        });

        element.find('.main-menu-toolbar-row').mousedown(function () {
          $('.main-menu-intro-row').eq($(this).index()).addClass('active');
        });

        element.find('.main-menu-toolbar-row').mouseup(function () {
          $('.main-menu-intro-row').eq($(this).index()).removeClass('active');
        });

        scope.$watch(function watchGetActive() {
          return scope.getActive();
        }, function (newValue, oldValue) {
          if (newValue !== oldValue) {
            element.find('.main-menu-panels').scrollTop(0);
          }
        });

        scope.$watch(function watchGetAdvance() {
          return scope.getAdvance();
        }, function (newValue, oldValue) {
          if (newValue !== oldValue) {
            element.find('.main-menu-panels').scrollTop(0);
          }
        });

        scope.$watch(function watchWorkSpaceHeight() {
          return element.height();
        }, function (newValue, oldValue) {
            if (newValue !== oldValue) {
              $timeout.cancel(resizeTimeOutId);

              resizeTimeOutId = $timeout(function () {
                scope.menu.height = element.height();
              }, 1);
            }
          }
        );
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('menuText', [function () {
    return {
      templateUrl: 'views/menu/text.html?ts='+Date.now(),
      restrict: 'E',
      scope: false,
      replace: true
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .controller('MenuCtrl', ['$scope', '$rootScope', 'PrintArea', 'PrintObject', 'Pricing', 'Design', 'DesignItem', 'Instructions', 'Viewport', 'SaveDesignModal', 'ShareModal', '$analytics', 'MainMenu', 'Clipart', 'InkColors',
  function ($scope, $rootScope, PrintArea, PrintObject, Pricing, Design, DesignItem, Instructions, Viewport, SaveDesignModal, ShareModal, $analytics, MainMenu, Clipart, InkColors) {
      var quote, instructionsModal;
      var designStudioProductMessage = 'Change your item color or choose from 200+ products';

      $scope.productDescription = designStudioProductMessage;
      $scope.isInstructionsOpen = false;

      $scope.PrintObject = PrintObject;
      $scope.isExtraSmall = Viewport.isExtraSmall();
      $scope.getProductItemUrl = DesignItem.getProductItemUrl;
      $scope.DesignItem = DesignItem;
      $scope.isEmbroidery = Design.isEmbroidery;

      $scope.hasActive = MainMenu.hasActive;
      $scope.getActive = MainMenu.getActive;
      $scope.hasAdvance = MainMenu.hasAdvance;
      $scope.getAdvance = MainMenu.getAdvance;
      $scope.setActive = MainMenu.setActive;
      $scope.setAdvance = MainMenu.setAdvance;
      $scope.isActive = MainMenu.isActive;

      $scope.showOverlay = function () {
        return Design.getInkColorCount() > 0;
      };

      $scope.changeOutlineColor = function (outlineColor) {
        PrintObject.data.outline.inkColorId = outlineColor.id;
        PrintObject.data.outline.color = outlineColor;

        if (PrintObject.data.outline.size == 0) {
          PrintObject.data.outline.size = 5;
        }

        if (PrintObject.data.type === 'textobject') {
          $analytics.eventTrack('font change - outline - color', {category: 'design studio', label: outlineColor.name});
        }
      };

      $scope.useStrokeShirtColor = function () {
        $scope.changeOutlineColor(InkColors.getShirtColor());
      };

      $scope.isOutlineShirtColor = function () {
        if (PrintObject.data.outline.size > 0) {
          return InkColors.isShirtColor(PrintObject.data.outline.color);
        }

        return false;
      };


      $scope.canShowOutlineShirtColor = function () {
        return $scope.isOutlineShirtColor() || PrintArea.data.printObjects.length > 1;
      };

      $scope.addTextObject = function () {
        if (Viewport.isExtraSmall()) {
          PrintObject.set({});
          MainMenu.setActive('addText');
        }else {
          addRealTimeTextObject();
        }
      };

      $scope.addClipart = function () {
        Clipart.newMode = true;
        $scope.setActive('addArt');
      };

      $scope.duplicatePrintObject = function (printObject) {
        var dupe = PrintObject.duplicatePrintObject(printObject, printObject.y + 10, PrintArea.getNewZIndex());

        PrintArea.printObjectAdd(PrintArea.data.printObjects, dupe);
        PrintObject.set(dupe);
      };

      $scope.deletePrintObject = function (printObject) {
        PrintArea.printObjectRemove(PrintArea.data.printObjects, PrintObject.data);
      };

      $scope.openSaveModal = function () {
        SaveDesignModal.open({
          onSuccess: function () {
            return ShareModal.open;
          }
        });
      };

      $scope.changeItem = function ($event) {
        $event.stopPropagation();
        $scope.setActive('catalog');
      };

      $scope.changeColor = function ($event) {
        $event.stopPropagation();
        $scope.setActive('editProduct');
        $scope.setAdvance('changeColor');
      };

      $scope.addColor = function ($event) {
        $event.stopPropagation();
        $scope.setActive('editProduct');
        // $scope.setAdvance('addColor');
      };

      $scope.getColorCount = function () {
        return Design.data.designItems.map(function (designItem) {
          return designItem.colors.length
        }).reduce(function (a, b) {
          return a + b;
        }, 0);
      };

      $scope.hasInstructions = Instructions.isSet;
      $scope.hasDistress = Design.hasDistress;
      $scope.toggleDistress = Design.toggleDistress;

      //this is a workaround till menu system re-factor.
      $scope.$on('printObjectSet', function (event, printObject, silentMenu) {
        if (printObject.type && silentMenu !== true) {
          $scope.setActive(printObject.type);
        }
      });

      //this is a workaround till menu system re-factor.
      $scope.$on('vinylSelected', function (event) {
        $scope.setActive('numbers');
      });

      //this is a workaround till menu system re-factor.
      $scope.$on('resetMenu', function (event) {
        $scope.setActive(false);
      });

      function addRealTimeTextObject() {
        var template;
        var textobject;
        var lastTextObject;
        var lastInkColor;
        var text = '';

        Design.deleteEmptyTextObjects();

        lastTextObject = _.last(_.filter(PrintArea.data.printObjects, function (print) {
          return print.type === 'textobject';
        }));

        if (lastTextObject && Design.isPrintObjectOutOfContainment(lastTextObject)) {
          lastTextObject = false;
        }

        if (lastTextObject) {
          lastTextObject = angular.copy(lastTextObject);
          lastTextObject.details.text = text;
          lastInkColor = PrintArea.getLastSingleInkColorUsed();

          if (angular.isDefined(lastInkColor)) {
            lastTextObject.details.inkColor = lastInkColor;
          }

          $scope.duplicatePrintObject(lastTextObject);
        } else {
          template = PrintArea.getPrintObjectTemplate();
          template.text = text;

          textobject = PrintObject.createTextObject(template);
          PrintArea.printObjectAdd(PrintArea.data.printObjects, textobject);
          PrintObject.set(textobject);
        }
      }
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('productCanvas', ['$rootScope', '$timeout', 'DesignItem', 'PrintArea', 'config', function ($rootScope, $timeout, DesignItem, PrintArea, config) {
    return {
      templateUrl: 'views/workspace/productCanvas.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: false,
      link: function postLink(scope, element, attrs) {

        var getImage = function () {
          return {
            width: scope.workspace.scale * scope.display.product.width,
            height: scope.workspace.scale * scope.display.product.height
          }
        };

        var getCanvas = function () {
          var top = 0;

          top -= scope.workspace.scale * scope.display.product.yoffset;
          top += (scope.workspace.height - (scope.workspace.scale * scope.display.product.height)) / 2;

          return {
            top: top,
            left: (scope.workspace.width - (scope.workspace.scale * scope.display.product.width)) / 2
          }
        };

        scope.getCSSStyle = getCSSStyle;
        scope.getMaskURL = getMaskURL;
        scope.getTextureURL = getTextureURL;
        scope.getColorHex = getColorHex;
        scope.getMaskTextureURL = getMaskTextureURL;
        scope.getProductUrl = getProductUrl;

        //this is a workaround to a chrome zoom gpu bug.
        scope.$watch('workspace', function () {
          var texture = element.find('#product-canvas-texture:visible');

          texture.css('overflow', 'auto');

          $timeout(function () {
            texture.css('overflow', 'hidden');
          }, 0);
        }, true);

        function getCSSStyle() {
          var image = getImage();
          var canvas = getCanvas();

          return {width: image.width, height: image.height, top: canvas.top, left: canvas.left};
        }

        function getMaskURL() {
          return DesignItem.getProductMaskUrl(DesignItem.item.style, PrintArea.data.code);
        }

        function getTextureURL() {
          return DesignItem.getProductTextureUrl(DesignItem.item.style, PrintArea.data.code);
        }

        function getColorHex() {
          return DesignItem.color.maskHex ? DesignItem.color.maskHex : DesignItem.color.hex;
        }

        function getMaskTextureURL() {
          return DesignItem.getProductMaskTextureURL(DesignItem.color.maskTexture);
        }

        function getProductUrl() {
          return DesignItem.getProductImageUrl(DesignItem.item.style, PrintArea.data.code, DesignItem.color.code);
        }
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('printArea', ['$timeout', 'Design', 'DesignItem', 'Color', function ($timeout, Design, DesignItem, Color) {
    return {
      templateUrl: 'views/workspace/printArea.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: true,
      controller: ['$scope', '$element', '$attrs', function($scope, $element, $attrs) {
        var hasMoving = false;

        $scope.displayBorder = false;
        $scope.displayWarning = false;

        $scope.showBorder = showBorder;
        $scope.hideBorder = hideBorder;
        $scope.warnContainment = warnContainment;

        this.showBorder = showBorder;
        this.hideBorder = hideBorder;
        this.warnContainment = warnContainment;

        this.hasMovingObjects = function () {
          return hasMoving;
        };

        this.setIsMoving = function (value) {
          hasMoving = value;
        }

        function warnContainment() {
          var warn = _.some($element.find('.print-object:not(.clippingobject)'), function (poEl) {
            return _.every($element.find('.print-area-guide'), function (pgEl) {
              return isOutContainment(angular.element(poEl), angular.element(pgEl));
            });
          });

          if ($scope.getPreview) {
            return;
          }

          if (warn) {
            $scope.showBorder();
            $scope.displayWarning = true;
          } else {
            $scope.hideBorder();
            $scope.displayWarning = false;
          }
        }

        function showBorder() {
          $scope.displayBorder = true;
        }

        function hideBorder() {
          $scope.displayBorder = false;
        }

        function isOutContainment(poEl, pgEl) {
          var buffer = 50;

          if (poEl.position().left + buffer < pgEl.position().left) {
            return true;
          }

          if (poEl.width() + poEl.position().left > pgEl.position().left + pgEl.width() + buffer) {
            return true;
          }

          if (poEl.position().top + buffer < pgEl.position().top) {
            return true;
          }

          if (poEl.height() + poEl.position().top > pgEl.position().top + pgEl.height() + buffer) {
            return true;
          }

          return false;
        }
      }],
      link: function postLink(scope, element, attrs) {
        scope.canvas = getCanvas();
        scope.guides = Design.getGuides();

        scope.isOnLightGarment = function isOnLightGarment() {
          var hsv = DesignItem.color.hex ? Color.hex2hsv(DesignItem.color.hex) : {s:0, v: 0};

          return hsv.s > 50 || hsv.v < 50;
        };

        scope.$watch('workspace', function (newValue, oldValue) {
          if (newValue !== oldValue) {
            scope.canvas = getCanvas();
          }
        }, true);

        scope.$on('printAreaSet', function (event, printArea) {
          scope.canvas = getCanvas();
          scope.guides = Design.getGuides();
          scope.displayBorder = false;
          scope.displayWarning = false;
        });

        scope.$on('catalogItemSet', function (event, printArea) {
          scope.canvas = getCanvas();
          scope.guides = Design.getGuides();
        });

        scope.$on('designLoaded', function (event, printArea) {
          scope.canvas = getCanvas();
          scope.guides = Design.getGuides();
        });

        scope.$on('printMethodSet', function (event, printArea) {
          scope.guides = Design.getGuides();
          scope.displayBorder = false;
          scope.displayWarning = false;

          $timeout(function () {
            scope.warnContainment();
          }, 0);
        });

        function getCanvas() {
          var canvas = {};
          var productTop = 0;
          var productLeft = (scope.workspace.width - (scope.workspace.scale * scope.display.product.width)) / 2;

          productTop -= scope.workspace.scale * scope.display.product.yoffset;
          productTop += (scope.workspace.height - (scope.workspace.scale * scope.display.product.height)) / 2;

          canvas.width = scope.PrintArea.data.focusWidth * scope.display.scale * scope.workspace.scale;
          canvas.height = scope.PrintArea.data.focusHeight * scope.display.scale * scope.workspace.scale;

          canvas.top = (scope.PrintArea.data.focusY * scope.display.scale * scope.workspace.scale) + productTop;
          canvas.left = (scope.PrintArea.data.focusX * scope.display.scale * scope.workspace.scale) + productLeft;

          return canvas;
        }
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('workSpace', ['$window', '$timeout', 'PrintObject', 'PrintObjectPopover', 'MainMenu', function ($window, $timeout, PrintObject, PrintObjectPopover, MainMenu) {
    return {
      templateUrl: 'views/workspace/workspace.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: false,
      link: function postLink(scope, element, attrs) {
        var resizeTimeOutId = null; //A buffer for the resize event to prevent unnecessary digests
        var checkWidthId = null;
        var checkHeightId = null;

        scope.disableUpload = false;
        scope.workspace.scale = getScale();
        scope.workspace.width = element.width();
        scope.workspace.height = element.height();

        scope.dragElementId = 'workspace-selection-box';
        scope.canStartDrag = canStartDrag;
        scope.onDragStart = onDragStart;
        scope.onDragEnd = onDragEnd;

        scope.$watch('focusArea', function (newValue, oldValue) {
          scope.workspace.scale = getScale();
        }, true);

        $window.onresize = function () {
          $timeout.cancel(resizeTimeOutId);

          resizeTimeOutId = $timeout(function(){
            scope.workspace.width = element.width();
            scope.workspace.height = element.height();
            scope.workspace.scale = getScale();
          }, 1);
        };

        scope.$watch(function watchWorkSpaceWidth() {
          return element.width();
        }, function (newValue, oldValue) {
            if (newValue !== oldValue) {
              $timeout.cancel(checkWidthId);

              checkWidthId = $timeout(function () {
                scope.workspace.width = element.width();
                scope.workspace.scale = getScale();
              }, 1);
            }
          }
        );

        scope.$watch(function watchWorkSpaceHeight() {
          return element.height();
        }, function (newValue, oldValue) {
            if (newValue !== oldValue) {
              $timeout.cancel(checkHeightId);

              checkHeightId = $timeout(function () {
                scope.workspace.height = element.height();
                scope.workspace.scale = getScale();
              }, 1);
            }
          }
        );

        element.data('enableDeselect', true);

        element.on('click', function (event) {
          var target = angular.element(event.target);

          if (PrintObject.isSet() && element.data('enableDeselect') && isWorkSpace(target)) {
            PrintObject.set({});
            PrintObjectPopover.hide();
            scope.$apply();
          } else if (MainMenu.getActive() === 'clippingMask' && isWorkSpace(target)) {
            MainMenu.setActive(false);
            scope.$apply();
          }
        });

        function isWorkSpace(target) {
          if (target.attr('id') === 'product-canvas') {
            return true;
          }

          //better performance than multiple hasClass http://jsperf.com/hasclass-vs-is-stackoverflow/7
          return !!target.attr('class') && target.attr('class').match(/print-area|product-canvas-image/) !== null;
        }

        function canStartDrag(event) {
          if (element.data('enableDeselect') === false) {
            return false;
          }

          if (isWorkSpace(angular.element(event.target)) === false) {
            return false;
          }

          return true;
        }

        function onDragStart() {
          PrintObject.set({});
          PrintObjectPopover.hide();
          scope.workspace.multiSelectedObjects.length = 0;
          scope.disableUpload = true;
          scope.$apply();
        }

        function onDragEnd() {
          var pos = getSelectedObjects();

          if (pos.length > 1) {
            scope.workspace.multiSelectedObjects = pos;
          } else if(pos.length === 1) {
            PrintObject.set(pos.shift());
            element.data('enableDeselect', false);

            $timeout(function () {
              angular.element('#workspace').data('enableDeselect', true);
            }, 5);
          }

          scope.disableUpload = false;
          scope.$apply();
        }

        function getSelectedObjects() {
          var selected = [];
          var box = angular.element('#' + scope.dragElementId);

          angular.element('.print-object').filter(function (index, po) {
            var bd = getPositions(box);
            var pd = getPositions(angular.element(po));
            var x = comparePositions(bd[0], pd[0]);
            var y = comparePositions(bd[1], pd[1]);

            return x && y;
          }).each(function (index, po) {
            var printObject = angular.element(po).scope().printObject;

            if (printObject.type !== 'clippingobject') {
              selected.push(printObject);
            }
          });

          return selected;
        }

        function comparePositions(p1, p2) {
          var r1, r2;

          r1 = p1[0] < p2[0] ? p1 : p2;
          r2 = p1[0] < p2[0] ? p2 : p1;

          return r1[1] > r2[0] || r1[0] === r2[0];
        }

        function getPositions(el) {
          var w = el.width();
          var h = el.height();
          var t = el.offset().top;
          var l = el.offset().left;

          return [[l, l + w], [t, t + h]];
        }

        function getScale() {
          if (element.width() / element.height() <= scope.focusArea.ratio) {
            return element.width() / scope.focusArea.width;
          } else {
            return element.height() / scope.focusArea.height;
          }
        }
      }
    };
  }]
);

"use strict";

angular.module("designstudioApp").constant("config", {
    gatewayURL: "json.php",
    uploadGatewayURL: "upload.php",
    catalogURL: "//s3.amazonaws.com/eztees-catalog",
    clipartURL: "//s3.amazonaws.com/eztees-clipart/svg",
    clipartPreviewURL: "//s3.amazonaws.com/eztees-clipart/png",
    uploadURL: "uploads",
    fontpreviewsURL: "//s3.amazonaws.com/eztees-images/font-previews/png",
    algolia: {
      id: "HFFYBW3LWB",
      key: "426d61a42b1579953e5f14f5d73a0684"
    },
    api: {
      url: "https://api.rushordertees.com"
    },
    lambda: {
      url: "https://luhul4uhfg.execute-api.us-east-1.amazonaws.com/prod"
    }
});

'use strict';

angular.module('designstudioApp').value('display', {
  ppi: 20,
  scale: 1.25 * (1200/1080),
  product: {
    width: 1200,
    height: 1130,
    yoffset: 102
  }
});

'use strict';

angular.module('designstudioApp')
    .service('JSONService', ['$http', '$rootScope', '$q', '$window', 'config', function JSONService($http, $rootScope, $q, $window, config) {
        var me = this;

        me.hasActiveOrder = function (data) {
          var url = config.gatewayURL + '/com.eztees.designstudio.Design.hasActiveOrder/';

          return $http.post(url, [data], {cache: false}).then(function (response) {
            return response.data === true || response.data === "true";
          });
        };

        me.getQuote = function (designItems, printAreas, vinyl) {
            var url = config.gatewayURL + '/com.eztees.core.PriceEngine.getQuote/';

            return $http.post(url, [designItems, printAreas, vinyl]);
        };

        me.getQuickQuote = function (itemId, colorId, quantity, printAreas, vinyl) {
            var url = config.gatewayURL + '/com.eztees.core.PriceEngine.quickQuote/';
            itemId = +itemId;
            colorId = +colorId;

            return $http.post(url, [itemId, colorId, quantity, printAreas, vinyl]);
        };

        me.getBulkFullQuote = function (requests) {
          var url = config.gatewayURL + '/com.eztees.core.PriceEngine.getBulkFullQuote/';

          return $http.post(url, [requests]);
        };

        me.getCatalogCategories = function (branding_id) {
          return $http.get(config.gatewayURL + '/com.eztees.catalog.Catalog.retrieveCatalogCategories/null/null/'+branding_id, {cache: true});
        };

        me.getClipartByCategoryId = function (id) {
          var deferred = $q.defer();
          var url = config.gatewayURL + '/com.eztees.designstudio.Clipart.getByCategory/' + id + '/1/200/';

          $http.get(url, {cache: false}).success(function(data, status, headers, config) {
            deferred.resolve(data.records);
          });

          return deferred.promise;
        };

        me.clipartSearch = function (term) {
          var deferred = $q.defer();
          var url = config.gatewayURL + '/com.eztees.designstudio.Clipart.keywordSearch/' + term + '/designstudio';

          $http.get(url, {cache: false}).success(function (data, status, headers, config) {
            deferred.resolve(data);
          });
        };

        me.getItemsByCategoryId = function (id, branding_id) {
          return $http.get(config.gatewayURL + '/com.eztees.catalog.Catalog.getByCategory/'+id+'/1/50/'+branding_id, {cache: true});
        };

        me.getItemById = function (id) {
          return $http.get(config.gatewayURL + '/com.eztees.catalog.Item.get/' + id, {cache: true});
        };

    }
]);

'use strict';

angular.module('designstudioApp').factory('Tracking', [
    '$window',
    'User',
    'JSONService',
    'APIService',
    function Campaign (
        $window,
        User,
        JSONService,
        APIService
    ) {
        var trackingData = {};
        var hash = [];

        function save() {
          var sessionId;

          if (!window.location.hostname.match(/rushordertees/)) {
              return false;
          }
          setTrackingData();
          sessionId = User.getSessionId();

          if (sessionId.length > 0) {
            trackingData.session = sessionId;

            return APIService.trackPageView(trackingData);
          }
        }

        function setTrackingData () {
          Object.keys(window.location).forEach(function (key) {
            trackingData[key] = window.location[key];
          });

          trackingData.referrer = window.document.referrer;
          trackingData.referrer_url = window.document.referrer;

          if (trackingData.hash.match(/\?/)) {
              hash = trackingData.hash.split('?');
              trackingData.hash = hash[0] || trackingData.hash;
              trackingData.search = hash[1] || trackingData.search;
          }
          trackingData.page_url = trackingData.pathname+trackingData.hash;
          trackingData.pageViewParams = [];

          if (angular.isDefined(trackingData.search) && (trackingData.search.length > 0)) {
              var searchTerms = trackingData.search.split('&');
              angular.forEach(searchTerms, function(term) {
                  var param = term.split('=');
                  trackingData.pageViewParams.push({
                    "param_key" : param[0],
                    "param_val" : param[1]
                  });
              });
          }

        }

        return {
            save: save,
        };
    }
]);

'use strict';

angular.module('designstudioApp')

    .service('Design', ['$rootScope', '$window', 'PrintArea', 'DesignItem', 'InkColors', 'Fonts', 'VinylColors', 'Vinyl', 'MarinTracker', 'LocalDesign', 'ClippingMasks', 'PrintObject', 'APIService','IP', 'MinimumQuantity', 'User',
    function Design($rootScope, $window, PrintArea, DesignItem, InkColors, Fonts, VinylColors, Vinyl, MarinTracker, LocalDesign, ClippingMasks, PrintObject, APIService, IP, MinimumQuantity, User) {
        var me = this;
        var virginData = {};
        var designId = false;
        var emailAddress = '';

        function onLoad(response) {
          DesignItem.etl(response);
          PrintArea.etl(response);

          me.data = response;
          virginData = angular.copy(response);

          APIService.getConfig().then(function (configData) {
            IP.etl(configData);
            Fonts.etl(configData);
            InkColors.etl(configData);
            VinylColors.etl(configData);
            ClippingMasks.etl(configData);
            MinimumQuantity.etl(configData);

            $rootScope.$broadcast('designLoaded', me.data);
          });
        }

        me.data = {designItems: [], printAreas: []};

        me.read = function (designId) {
          if (designId) {
            return APIService.getDesignById(designId).success(function (response) {
              if (designId != response.id) {
                return APIService.getNewDesign().success(onLoad);
              } else {
                onLoad(response);
              }
            });
          } else {
            designId = false;
            return APIService.getNewDesign().success(onLoad);
          }
        };

        me.readDefault = function (itemId, colorId, methodCode) {
          designId = false;
          return APIService.getNewDesign(itemId, colorId, methodCode).success(onLoad);
        };

        me.readLocal = function () {
          var design = angular.copy(me.data);
          var local = LocalDesign.get(design.id);

          design = angular.extend(design, local);
          onLoad(design);
        };

        me.loadData = function (data) {
          var existing;
          var design = angular.copy(me.data);

          data = angular.copy(data);
          design = angular.extend(design, data);

          PrintArea.etl(design, PrintArea.data.code);

          if (PrintObject.isSet()) {
            existing = design.printAreas.map(function (printArea) {
              return printArea.printObjects.filter(function (printObject) {
                return printObject.uid === PrintObject.data.uid;
              });
            });

            existing = [].concat.apply([], existing).shift();

            if (existing) {
              PrintObject.set(existing);
            } else {
              PrintObject.set({});
            }
          }

          me.data = design;
        };

        me.isDirty = function () {
          var virgin = angular.copy(virginData);
          var existing = angular.copy(me.data);

          virgin.designItems = DesignItem.resetQuantity(virgin.designItems);
          existing.designItems = DesignItem.resetQuantity(existing.designItems);

          return !angular.equals(existing, virgin);
        };

        me.isClean = function () {
          return !me.isDirty();
        };

        me.save = function (design, saveConfig) {
          var promise, isNew;

          design = angular.copy(design);
          design = me.transformForSave(design);
          me.setEmail(design.user.email);

          isNew = !design.id;
          saveConfig = convertSaveConfig(saveConfig);
          promise = APIService.saveDesign(design, saveConfig);
          LocalDesign.remove(design.id);

          return promise.then(function (response) {
            if (angular.isString(response.data)) {
              design.id = parseInt(response.data.replace('"', ''), 10);
            } else {
              design.id = parseInt(response.data, 10);
            }

            designId = design.id;

            if (isNew) {
              MarinTracker.track(design.id, 'saved');
            }

            LocalDesign.remove(design.id);

            return me.read(design.id);
          });
        };

        me.share = function (data) {
          return APIService.shareDesign(data);
        };

        me.getEmail = function () {
          return emailAddress;
        };

        me.getOriginalEmail = function () {
          if (me.data.user) {
            return me.data.user.email;
          }
        };

        me.setEmail = function (email) {
          emailAddress = email;
        };

        me.getId = function () {
          return designId;
        };

        me.getName = function () {
          return me.data.name ? me.data.name : '';
        };

        me.transformForSave = function (design) {
          for (var i = design.printAreas.length - 1; i >= 0; i--) {
            design.printAreas[i] = PrintArea.transformForSave(design.printAreas[i]);
          }

          return design;
        };

        me.deleteEmptyTextObjects = function () {
          for (var i = me.data.printAreas.length - 1; i >= 0; i--) {
            for (var j = me.data.printAreas[i].printObjects.length - 1; j >= 0; j--) {
              if (me.data.printAreas[i].printObjects[j].type === 'textobject' && me.data.printAreas[i].printObjects[j].details.text.length === 0) {
                PrintArea.printObjectRemove(me.data.printAreas[i].printObjects, me.data.printAreas[i].printObjects[j]);
              }
            }
          }
        };

        me.togglePrintArea = function () {
          var nextCode = PrintArea.data.code === 'f' ? 'b' : 'f';

          me.setPrintAreaSide(nextCode);
        };

        me.setPrintAreaSide = function (side) {
          var active = _.findWhere(me.data.printAreas, {code: side});

          if (angular.isDefined(active)) {
            PrintArea.set(active);
            $rootScope.$broadcast('printAreaToggled');
          }
        };

        me.hasPreviousOrder = function () {
          return me.data.hasPreviousOrder;
        };

        me.hasVinyl = function (design) {
          if (angular.isUndefined(design.printAreas)) {
            return false;
          }

          for (var i = design.printAreas.length - 1; i >= 0; i--) {
            if (PrintArea.hasVinyl(design.printAreas[i])) {
              return true;
            }
          }

          return false;
        };

        me.isEmbroidery = function () {
          return me.getPrintMethodCode() === 'emb';
        };

        me.hasAtleastOneUpload = function () {
          return me.data.printAreas.map(function (pa) {
            return pa.printObjects;
          }).reduce(function (a, b) {
            return a.concat(b);
          }).filter(function (po) {
            return po.type === 'uploadobject';
          }).length > 0;
        };

        me.getVinylPrintArea = function (design) {
          for (var i = design.printAreas.length - 1; i >= 0; i--) {
            if (PrintArea.hasVinyl(design.printAreas[i])) {
              return design.printAreas[i];
            }
          }

          return {};
        };

        me.getDistress = function () {
          var distressed = 0;

          if (!me.data.printAreas) {
            return distressed;
          }

          for (var i = me.data.printAreas.length - 1; i >= 0; i--) {
            if (me.data.printAreas[i].distressed > 0) {
              distressed = me.data.printAreas[i].distressed;

              break;
            }
          }

          return distressed;
        };

        me.setDistress = function (distressed) {
          for (var i = me.data.printAreas.length - 1; i >= 0; i--) {
            me.data.printAreas[i].distressed = distressed;
          }
        };

        me.hasDistress = function () {
          return !!me.getDistress();
        };

        me.toggleDistress = function () {
          var value = me.getDistress() == 1 ? 0 : 1;

          me.setDistress(value);
        };

        me.getPrintMethodCode = function () {
          for (var i = me.data.printAreas.length - 1; i >= 0; i--) {
            return me.data.printAreas[i].printMethod.code;
          }

          return 'scr';
        };

        me.hasUnsupportedFeatures = function (design) {
            for (var i = design.printAreas.length - 1; i >= 0; i--) {
                if (PrintArea.hasUnsupportedFontSpace(design.printAreas[i])) {
                    return true;
                }
            }

            return false;
        };

        me.getQuantity = function() {
          var quantity = 0;

          for (var i = 0; i < me.data.designItems.length; i++) {
            for (var j = 0; j < me.data.designItems[i].colors.length; j++) {
              quantity += DesignItem.getQuantity(me.data.designItems[i].colors[j].sizes);
            }
          }

          return quantity;
        };

        me.hasMinQuantity = function () {
          var quantity = me.getQuantity();

          return quantity >= me.getMinQuantity() ? true: false;
        };

        me.getMinQuantity = function () {
          var code = me.getPrintMethodCode();

          return me.isBlank() ? MinimumQuantity.getBlank() : MinimumQuantity.getByPrintMethod(code);
        };

        me.getLowVolumeQuantity = function () {
          return 3;
        };

        me.isLowVolume = function () {
          var quantity = me.getQuantity();
          var lvq = me.getLowVolumeQuantity();

          return quantity < lvq && me.isBlank() === false;
        };

        me.hasNonLowVolumeProduct = function () {
          return me.getLowVolumeProducts().then(checkProducts);

          function checkProducts(products) {
            return !me.data.designItems.every(function (designItem) {
              return products.some(function (product) {
                return product.style.toLowerCase() === designItem.style.toLowerCase();
              });
            });
          }
        };

        me.getLowVolumeProducts = function () {
          return APIService.getDTGSafeItems();
        };

        me.isBlank = function () {
          return me.getInkColorCount() === 0 && !me.hasVinyl(me.data);
        };

        me.isInkColorInUse = function (inkColor) {
          var ids = [];

          for (var i = me.data.printAreas.length - 1; i >= 0; i--) {
            ids = ids.concat(PrintArea.getRealInkColorIds(me.data.printAreas[i]));
          }

          return ids.filter(function (id) {
            return inkColor.id == id;
          }).length > 0;
        };

        me.getInkColorCount = function () {
          var inkColors = 0;

          for (var i = me.data.printAreas.length - 1; i >= 0; i--) {
            inkColors += PrintArea.countInkColors(me.data.printAreas[i]);
          }

          return inkColors;
        };

        me.hasMatchingVinylQuantity = function () {
          var sizeQuantity = me.getQuantity();
          var vinylQuantity = 0;

          me.data.designItems.forEach(function (designItem) {
            designItem.colors.forEach(function (color) {
              vinylQuantity += Vinyl.getQuantity(color.sizes);
            });
          });

          return sizeQuantity == vinylQuantity;
        };
        me.removeItem = function (designItem) {
          me.data.designItems.splice(me.data.designItems.indexOf(designItem), 1);

          if (DesignItem.item.catalogItemId ==  designItem.catalogItemId) {
            DesignItem.switchItemColor(me.data.designItems[0]);
          }
        };

        me.setItemPrintAreas = function (printAreas) {
          var active, methodCode = me.getPrintMethodCode();

          printAreas.filter(function (pa) {
            return !me.data.printAreas.some(function (ePa) {
              return pa.code == ePa.code;
            });
          }).filter(function (pa) {
            return pa.printMethods.some(function (pm) {
              return pm.printMethodCode === methodCode;
            });
          }).forEach(function (miss) {
            var template = angular.copy(me.data.printAreas[0]);

            template.id = null;
            template.default = false;
            template.code = miss.code;
            template.description = miss.description;
            template.templateId = miss.printAreaTemplateId;
            template.printObjects.length = 0;

            me.data.printAreas.push(template);
          });

          me.setPrintAreaFocusArea(printAreas);

          active = _.findWhere(me.data.printAreas, {'default': true});
          active = _.isEmpty(active) ? me.data.printAreas[0] : active;
          PrintArea.set(active);
        };

        me.setPrintAreaFocusArea = function (printAreas) {
          me.data.printAreas.forEach(function (ePa) {
            var pm, iPa = printAreas.filter(function (pa) {
              return pa.code == ePa.code;
            })[0];

            if (angular.isUndefined(iPa)) {
              return false;
            }

            ePa.focusX = iPa.focusX;
            ePa.focusY = iPa.focusY;
            ePa.focusWidth = iPa.focusWidth;
            ePa.focusHeight = iPa.focusHeight;
          });
        };

        me.checkActivePrintArea = function () {
          var matches = DesignItem.item.printAreas.filter(function (printArea) {
            return PrintArea.data.code == printArea.code;
          });

          if (matches.length === 0) {
            me.setPrintAreaSide(DesignItem.item.printAreas[0].code);
          }
        };

        me.addNewItem = function (catalogItem, color) {
          var existing =  me.data.designItems.some(function (designItem) {
            return catalogItem.id == designItem.catalogItemId;
          });

          if (existing) {
            return false;
          }

          color = DesignItem.prepNewColor(color);

          catalogItem.id = null;
          catalogItem.info = null;
          catalogItem.colors = [color];
          DesignItem.transformItem(catalogItem);

          me.data.designItems.push(catalogItem);
          me.setItemPrintAreas(catalogItem.printAreas);
          DesignItem.switchItemColor(catalogItem);

          return true;
        };

        me.changeNewItem = function (catalogItem) {
          me.setPreferredPrintMethod(catalogItem.printAreas);
          DesignItem.setItem(catalogItem);
          me.setItemPrintAreas(catalogItem.printAreas);
          filterPrintAreas();
          filterDesignItems();
        };

        me.getSides = function () {
          return DesignItem.getSides(me.getPrintMethodCode());
        };

        me.getGuides = function () {
          return DesignItem.getGuides(me.getPrintMethodCode(), PrintArea.data.code);
        };

        me.togglePrintMethod = function () {
          var current = me.getPrintMethodCode();
          var next = current === 'scr' ? 'emb': 'scr';

          me.setPrintMethodByCode(next);
        };

        me.setPreferredPrintMethod = function (printAreas) {
          var pm;

          if (angular.isUndefined(printAreas[0])) {
            return;
          }

          pm = printAreas[0].printMethods.filter(function (pm) {
            return parseInt(pm.preferred, 10);
          }).shift();

          if (angular.isUndefined(pm)) {
            return;
          }

          me.setPrintMethod(pm);
        };

        me.setPrintMethodByCode = function (code) {
          var pm, pa = DesignItem.item.printAreas.filter(function (pa) {
            return pa.default;
          }).shift();

          if (angular.isUndefined(pa)) {
            pa = DesignItem.item.printAreas[0];
          }

          if (angular.isUndefined(pa)) {
            return false;
          }

          pm = pa.printMethods.filter(function (pm) {
            return pm.printMethodCode === code;
          }).shift();

          me.setPrintMethod(pm);
          filterPrintAreasByMethodCode(code);
          me.setItemPrintAreas(DesignItem.item.printAreas);

          $rootScope.$broadcast('printMethodSet', pm);
        };

        me.setPrintMethod = function (pm) {
          if (angular.isUndefined(pm)) {
            return false;
          }

          me.data.printAreas.forEach(function (pa) {
            pa.printMethod.id = pm.printMethodId;
            pa.printMethod.code = pm.printMethodCode;
            pa.printMethod.description = pm.printMethodDescription;

            if (pm.printMethodCode === 'emb') {
              pa.distressed = 0;
              pa.vinyl.names = 0;
              pa.vinyl.numbers = 0;

              pa.printObjects.forEach(function (po) {
                if (po.type === 'uploadobject') {
                  if (po.details.multiColor != 0 || po.details.multiColor != 2) {
                    po.details.multiColor = 2;
                    po.details.clipping = 'ffffff';
                    po.details.inkColors = InkColors.process.slice();
                  }
                }
              });
            }
          });
        };

        me.getIncompatibleItems = function (catalogItem) {
          return me.data.designItems.filter(function (designItem) {
            if (designItem.catalogItemId === DesignItem.item.catalogItemId) {
              return false;
            }

            return catalogItem.printAreas.some(function (pa) {
              return pa.printMethods.some(function (pm) {
                return !doesItemHaveMethod(designItem, pm.printMethodCode);
              });
            });
          })
        };

        me.isExistingItem = function (itemId) {
          return me.data.designItems.some(function (designItem) {
            return parseInt(designItem.catalogItemId, 10) == parseInt(itemId, 10);
          });
        };

        me.isPrintObjectOutOfContainment = function (printObject) {
          var guides = me.getGuides();

          return guides.filter(function (guide) {
            var withinX = printObject.x > guide.x && printObject.x < guide.x + guide.width;
            var withinY = printObject.y > guide.y && printObject.y < guide.y + guide.height;

            return withinX && withinY;
          }).length === 0;
        };

        me.isAbleToReadDefault = function(itemId, colorId, methodCode) {
          return (
            (angular.isDefined(itemId) && itemId !== null) ||
            (angular.isDefined(methodCode) && methodCode !== null) ||
            (angular.isDefined(colorId) && colorId !== null)
          );
        };

        function filterPrintAreas() {
          var missing = me.data.printAreas.filter(function (printArea) {
            return !me.data.designItems.some(function (item) {
              return item.printAreas.some(function (pa) {
                return pa.code == printArea.code;
              });
            });
          });

          missing.forEach(function (miss) {
            me.data.printAreas.splice(me.data.printAreas.indexOf(miss), 1);
          });
        }

        function filterPrintAreasByMethodCode(methodCode) {
          var missing = me.data.printAreas.filter(function (printArea) {
            return !me.data.designItems.some(function (item) {
              return item.printAreas.some(function (pa) {
                if (pa.code === printArea.code) {
                  return pa.printMethods.some(function (pm) {
                    return pm.printMethodCode === methodCode;
                  });
                } else {
                  return false;
                }
              });
            });
          });

          missing.forEach(function (miss) {
            me.data.printAreas.splice(me.data.printAreas.indexOf(miss), 1);
          });
        }

        function filterDesignItems() {
          var matches = me.data.designItems.filter(function (designItem) {
            return me.data.printAreas.some(function (pa) {
              return !doesItemHaveMethod(designItem, pa.printMethod.code);
            });
          });

          matches.forEach(function (match) {
            me.data.designItems.splice(me.data.designItems.indexOf(match), 1);
          });
        }

        function doesItemHaveMethod(designItem, methodCode) {
          return designItem.printAreas.filter(function (printArea) {
            return printArea.printMethods.some(function (printMethod) {
              return printMethod.printMethodCode === methodCode;
            });
          }).length > 0;
        }

      function convertSaveConfig(saveConfig) {
        var urlConfig = {
          sessionId: User.getSessionId(),
          blockSaveEmail: saveConfig ? !!saveConfig.blockSaveEmail : false,
          studioUrl: $window.location.origin + $window.location.pathname + '#/'
        };

        return urlConfig;
      }
    }
]);

'use strict';

angular.module('designstudioApp')
    .service('PrintArea', ['$rootScope', 'PrintObject', 'InkColors', 'DesignItem', 'Color', 'display', function PrintArea($rootScope, PrintObject, InkColors, DesignItem, Color, display) {
      var me = this;

      function refreshZIndex(printObjects) {
        printObjects = printObjects.sort(function (a, b) {
          return a.zIndex - b.zIndex;
        });

        printObjects.forEach(function (print, index) {
          print.zIndex = index;
        });
      }

      me.data = {
        width: 12,
        height: 16,
        focusX: 312,
        focusY: 320,
        focusWidth: 240,
        focusHeight: 320,
        printObjects: []
      };

      me.etl = function (design, side) {
          var active;

          me.extract(design);

          if (side) {
            active = _.findWhere(design.printAreas, {'code': side});
          } else {
            active = _.findWhere(design.printAreas, {'default': true});
          }

          active = _.isEmpty(active) ? design.printAreas[0] : active;
          me.set(active);
      };

      me.extract = function (design) {
          for (var i = design.printAreas.length - 1; i >= 0; i--) {
            design.printAreas[i] = me.transform(design.printAreas[i]);
          }
      };

      me.transform = function (printArea) {
          for (var i = printArea.printObjects.length - 1; i >= 0; i--) {
              printArea.printObjects[i].x = parseFloat(printArea.printObjects[i].x);
              printArea.printObjects[i].y = parseFloat(printArea.printObjects[i].y);
              printArea.printObjects[i].scaleX = parseFloat(printArea.printObjects[i].scaleX);
              printArea.printObjects[i].scaleY = parseFloat(printArea.printObjects[i].scaleY);
              printArea.printObjects[i].zIndex = parseInt(printArea.printObjects[i].zIndex, 10);
              printArea.printObjects[i].rotation = parseFloat(printArea.printObjects[i].rotation);
              printArea.printObjects[i].inkColors = _.toArray(printArea.printObjects[i].inkColors);
              printArea.printObjects[i].uid = printArea.printObjects[i].uid || _.uniqueId('printObject-');

              for (var j = printArea.printObjects[i].effects.length - 1; j >= 0; j--) {
                  if (printArea.printObjects[i].effects[j].type == 2) {
                      printArea.printObjects[i].arc = printArea.printObjects[i].effects[j];
                      printArea.printObjects[i].arc.angle = parseFloat(printArea.printObjects[i].arc.angle);
                  } else if (printArea.printObjects[i].effects[j].type == 4) {
                      printArea.printObjects[i].outline = printArea.printObjects[i].effects[j];
                  } else if (printArea.printObjects[i].effects[j].type == 6) {
                      printArea.printObjects[i].threshold = printArea.printObjects[i].effects[j];
                      printArea.printObjects[i].threshold.size = parseInt(printArea.printObjects[i].threshold.size, 10);
                  }
              }

              printArea.printObjects[i].effects = [];

              if (printArea.printObjects[i].type === 'uploadobject') {
                printArea.printObjects[i].details.multiColor = parseInt(printArea.printObjects[i].details.multiColor, 10);
                printArea.printObjects[i].threshold = printArea.printObjects[i].threshold || {size: 0, type: 6};
                printArea.printObjects[i].details.clipping = printArea.printObjects[i].details.clipping.toLowerCase();
                printArea.printObjects[i].details.clippings = _.toArray(printArea.printObjects[i].details.clippings);
                printArea.printObjects[i].details.swappings = _.toArray(printArea.printObjects[i].details.swappings);
              }
          }

          if (printArea.vinyl) {
            printArea.vinyl.size = parseInt(printArea.vinyl.size, 10);
            printArea.vinyl.names = parseInt(printArea.vinyl.names, 10);
            printArea.vinyl.numbers = parseInt(printArea.vinyl.numbers, 10);
          }

          return printArea;
      };

      me.transformForSave = function (printArea) {
        for (var i = printArea.printObjects.length - 1; i >= 0; i--) {

          if (printArea.printObjects[i].type === 'textobject') {
            printArea.printObjects[i].details.text = printArea.printObjects[i].details.text.replace(/\r\n|\r|\n/gm, '\n');
          }

          if (printArea.printObjects[i].details && printArea.printObjects[i].details.inkColors) {
            printArea.printObjects[i].details.inkColors = _.reject(printArea.printObjects[i].details.inkColors, function (inkColor) {
              return inkColor === null;
            });
          }

          printArea.printObjects[i].effects = printArea.printObjects[i].effects || [];

          if (printArea.printObjects[i].arc) {
            printArea.printObjects[i].effects.push(printArea.printObjects[i].arc);
            delete printArea.printObjects[i].arc;
          }

          if (printArea.printObjects[i].outline) {
            printArea.printObjects[i].effects.push(printArea.printObjects[i].outline);
            delete printArea.printObjects[i].outline;
          }

          if (printArea.printObjects[i].threshold) {
            printArea.printObjects[i].effects.push(printArea.printObjects[i].threshold);
            delete printArea.printObjects[i].threshold;
          }
        }

        return printArea;
      };

      me.set = function (printArea) {
          me.data = printArea;
          $rootScope.$broadcast('printAreaSet', printArea);
      };

      me.getRealInkColorIds = function (printArea) {
        var inkColors = [];

        for (var i = printArea.printObjects.length - 1; i >= 0; i--) {
          inkColors = inkColors.concat(PrintObject.getRealInkColors(printArea.printObjects[i]));
        }

        return inkColors;
      };

      me.getInkColorIds = function (printArea) {
          var inkColors = [];

          for (var i = printArea.printObjects.length - 1; i >= 0; i--) {
            inkColors = inkColors.concat(PrintObject.getInkColors(printArea.printObjects[i]));
          }

          return inkColors;
      };

      me.countInkColors = function (printArea) {
          var inkColors = me.getInkColorIds(printArea);

          return _.uniq(inkColors).length;
      };

      me.getClippingMask = function () {
        return me.data.printObjects.filter(function (po) {
          return po.type === 'clippingobject';
        }).shift();
      };

      me.hasClippingMask = function () {
        return !!me.getClippingMask();
      };

      me.hasVinyl = function (printArea) {
          if (printArea.vinyl && (printArea.vinyl.numbers > 0 || printArea.vinyl.names > 0) ) {
              return true;
          } else {
              return false;
          }
      };

      me.hasClipart = function (printArea) {
          for (var i = printArea.printObjects.length - 1; i >= 0; i--) {
              if (printArea.printObjects[i].type === 'clipartobject') {
                  return true;
              }
          }

          return false;
      };

      me.hasInvalidFontSpace = function (printArea) {
          for (var i = printArea.printObjects.length - 1; i >= 0; i--) {
              if (printArea.printObjects[i].type === 'textobject' && printArea.printObjects[i].details.fontSpace < 30) {
                  return true;
              }
          }

          return false;
      };

      me.printObjectMoveUp = function (printObject) {
          var neighbor = _.findWhere(me.data.printObjects, {zIndex: printObject.zIndex + 1});

          if (neighbor) {
              neighbor.zIndex -= 1;
              printObject.zIndex += 1;
          }
      };

      me.printObjectMoveDown = function (printObject) {
          var neighbor = _.findWhere(me.data.printObjects, {zIndex: printObject.zIndex - 1});

          if (neighbor) {
              neighbor.zIndex += 1;
              printObject.zIndex -= 1;
          }
      };

      me.printObjectToFront = function (printObject) {
        for (var i = 1; i < me.data.printObjects.length; i++) {
          me.printObjectMoveUp(printObject);
        }
      };

      me.printObjectToBack = function (printObject) {
        for (var i = 1; i < me.data.printObjects.length; i++) {
          me.printObjectMoveDown(printObject);
        }
      };

      me.printObjectRemove = function (printObjects, printObject) {
          // may want to replace indexOf with a for loop to improve performance.
          var index = printObjects.indexOf(printObject);

          if (index >= 0) {
            printObjects.splice(index, 1);
          }

          refreshZIndex(printObjects);

          if (PrintObject.data === printObject) {
              PrintObject.set({});
          }
      };

      me.deletePrintObject = function (printObject) {
        me.printObjectRemove(me.data.printObjects, printObject);
      };

      me.addPrintObject = function (printObject) {
        me.printObjectAdd(me.data.printObjects, printObject);
      };

      me.printObjectAdd = function (printObjects, printObject) {
        printObjects.push(printObject);
        $rootScope.$broadcast('printObjectAdded', printObject);
      };

      me.getNewZIndex = function () {
        var count = me.data.printObjects.length;

        me.data.printObjects = me.data.printObjects.sort(function (a, b) {
          return a.zIndex - b.zIndex;
        });

        return count > 0 ? me.data.printObjects[count - 1].zIndex + 1 : 0;
      };

      me.getFocusArea = function () {
        var focus = {};

        focus.width = parseFloat(me.data.focusWidth) * display.scale;
        focus.height = parseFloat(me.data.focusHeight) * display.scale;
        focus.ratio = focus.width / focus.height;

        return focus;
      };

      me.getPrintObjectTemplate = function (config) {
        var yDivisor = 2;
        var template = {};
        var lastInkColor = false;
        var guides = DesignItem.getGuides(me.data.printMethod.code, me.data.code);
        var guide = _.findWhere(guides, {'default': 1});

        config = config || {};
        guide = guide ? guide : guides[0];

        if (config.type !== 'upload') {
          yDivisor = me.data.printObjects.length === 0 ? 3 : yDivisor;
        }

        if (guide) {
          template.x = guide.x + (guide.width / 2);
          template.y = guide.y + (guide.height / yDivisor);
        } else {
          template.x = me.data.focusWidth / 2;
          template.y = me.data.focusHeight / yDivisor;
        }

        template.zIndex = me.getNewZIndex();
        template.outlineColor = _.findWhere(InkColors.data, {name: 'Red'});
        lastInkColor = me.getLastSingleInkColorUsed();

        if (lastInkColor) {
          template.inkColor = lastInkColor;
        } else if (Color.isHexDark(DesignItem.color.hex)) {
          template.inkColor = _.findWhere(InkColors.data, {name: 'White'});
        } else {
          template.inkColor = _.findWhere(InkColors.data, {name: 'Black'});
        }

        return template;
      };

      me.getLastSingleInkColorUsed = function () {
        var last = _.last(_.filter(me.data.printObjects, function (po) {
          if (po.type === 'textobject' || po.type === 'clipartobject') {
            return true;
          }

          if (po.type === 'uploadobject' && po.details.multiColor == 0) {
            return true;
          }
        }));

        if (angular.isDefined(last)) {
          return last.details.inkColor;
        } else {
          return false;
        }
      };
    }
]);

'use strict';

angular.module('designstudioApp')
    .service('PrintObject', ['$rootScope', 'InkColors', function PrintObject($rootScope, InkColors) {
        var me = this;
        var template = {
          id: null,
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: 0,
          rotation: 0
        };

        var beenWarned = [];

        me.data = {};
        me.proportionate = true;

        me.wasWarned = function (printObject) {
          return _.contains(beenWarned, printObject);
        };

        me.addWarned = function (printObject) {
          if (me.wasWarned(printObject) === false) {
            beenWarned.push(printObject);
          }
        };

        me.set = function (printObject, silentMenu) {
          if (printObject.type === 'clippingobject') {
            return false;
          }

          me.data = printObject;
          silentMenu = silentMenu || false;

          $rootScope.$broadcast('printObjectSet', printObject, silentMenu);
        };

        me.isSet = function () {
          return !angular.equals({}, me.data);
        };

        me.isEqual = function (printObject) {
          return angular.equals(printObject, me.data) && me.isSet() ? true : false;
        };

        me.duplicatePrintObject = function (printObject, newY, newZIndex) {
          var dupe = angular.copy(printObject);

          dupe.id = null;
          dupe.uid = _.uniqueId('printObject-');
          dupe.zIndex = newZIndex;
          dupe.y = newY;
          dupe.details.id = null;
          dupe.outline.id = null;

          if (dupe.type === 'textobject') {
            dupe.arc.id = null;
          } else if (dupe.type === 'uploadobject') {

          } else if (dupe.type === 'clipartobject') {
            dupe.details.id = null;
            dupe.details.clipartObjectLayerId = null;
          }

          return dupe;
        };

        me.createUploadObject = function (config) {
          var printobject = angular.copy(template);

          printobject.x = config.x;
          printobject.y = config.y;
          printobject.zIndex = config.zIndex;
          printobject.type = 'uploadobject',
          printobject.uid = _.uniqueId('printObject-');
          printobject.details = {
            clipping: 'ffffff',
            multiColor: 0,
            inkColor: config.inkColor,
            inkColorId: config.inkColor.id,
            inkColors: [],
            clippings: [],
            swappings: [],
            uploadFileId: config.file.fileId,
            uploadFile: {
              id: config.file.fileId,
              fileName: config.file.fileName,
              origName: config.file.origFileName,
              origExt: '.' + config.file.origFileName.split('.').pop()
            }
          };

          printobject.outline = {
            size: '0',
            color: config.outlineColor,
            inkColorId: config.outlineColor.id,
            type: 4
          };

          printobject.threshold = {
            size: 0,
            type: 6
          };

          return printobject;
        };

        me.createClipartObject = function (config) {
          var printobject = angular.copy(template);

          printobject.x = config.x;
          printobject.y = config.y;
          printobject.zIndex = config.zIndex;
          printobject.type = 'clipartobject';
          printobject.uid = _.uniqueId('printObject-');
          printobject.details = {
            src: config.clipartSrc,
            clipartId: config.clipartId,
            inkColor: config.inkColor,
            inkColorId: config.inkColor.id
          };

          printobject.outline = {
            size: '0',
            color: config.outlineColor,
            inkColorId: config.outlineColor.id,
            type: 4
          };

          return printobject;
        };

        me.createTextObject = function (config) {
          var textobject = angular.copy(template);

          textobject.x = config.x;
          textobject.y = config.y;
          textobject.zIndex = config.zIndex;
          textobject.type = 'textobject';
          textobject.scaleX = config.scaleX || textobject.scaleX;
          textobject.scaleY = config.scaleY || textobject.scaleY;
          textobject.uid = _.uniqueId('printObject-');
          textobject.details = {
            text: config.text,
            fontSize: 20,
            font: config.font || 'Interstate Black',
            align: 'alignCenter',
            fontSpace: 100,
            inkColor: config.inkColor,
            inkColorId: config.inkColor.id
          };

          textobject.arc = {
            angle: 0,
            type: 2
          };

          textobject.outline = {
            size: '0',
            color: config.outlineColor,
            inkColorId: config.outlineColor.id,
            type: 4
          };

          return textobject;
        };

        me.createClippingObject = function (config) {
          var clippingobject = angular.copy(template);

          clippingobject.zIndex = config.zIndex;
          clippingobject.type = 'clippingobject';
          clippingobject.uid = _.uniqueId('printObject-');

          clippingobject.details = {
            fileName: config.fileName,
            clippingMaskId: config.clippingMaskId
          };

          return clippingobject;
        };

        me.getRealInkColors = function (printObject) {
          var inkColors = [];

          if (printObject.type === 'uploadobject') {
            if (printObject.details.multiColor != 0) {
              if (printObject.details.multiColor == 2) {
                return inkColors;
              }

              for (var i = printObject.details.inkColors.length - 1; i >= 0; i--) {
                inkColors.push(printObject.details.inkColors[i]);
              }
            } else {
              inkColors.push(printObject.details.inkColor);
            }
          } else if(printObject.type !== 'clippingobject') {
            inkColors.push(printObject.details.inkColor);
          }

          if (printObject.outline && printObject.outline.size > 0) {
            inkColors.push(printObject.outline.color);
          }

          return _.uniq(inkColors.filter(function (color) {
            return !color.isFree;
          }).map(function (color) {
            return color.id;
          }));
        };

        me.getInkColors = function (printObject) {
          var inkColors = [];

          if (printObject.type === 'uploadobject') {
            if (printObject.details.multiColor != 0) {
              for (var i = printObject.details.inkColors.length - 1; i >= 0; i--) {
                inkColors.push(printObject.details.inkColors[i]);
              }
            } else {
              inkColors.push(printObject.details.inkColor);
            }
          } else if(printObject.type !== 'clippingobject') {
            inkColors.push(printObject.details.inkColor);
          }

          if (printObject.outline && printObject.outline.size > 0) {
            inkColors.push(printObject.outline.color);
          }

          return _.uniq(inkColors.filter(function (color) {
            return !color.isFree;
          }).map(function (color) {
            return color.id;
          }));
        };

        me.flipH = function (printObject) {
            printObject.scaleX = -1 * printObject.scaleX;
        };

        me.flipV = function (printObject) {
            printObject.scaleY = -1 * printObject.scaleY;
        };

        me.isProportionate = function () {
          return me.proportionate;
        };

        me.toggleProportionate = function () {
            me.proportionate = !me.proportionate;
        };

        me.setSize = function (newValue) {
            var newScaleY = false;
            var newScaleX = false;
            var oldValue = me.data.scaleX;

            newScaleY = Math.abs(newValue / oldValue) * me.data.scaleY;
            newScaleY = parseFloat(newScaleY);

            if (me.data.scaleY != newScaleY) {
                me.data.scaleY = newScaleY;
            }

            newScaleX = Math.abs(newValue / oldValue) * oldValue;
            newScaleX = parseFloat(newScaleX);

            me.data.scaleX = newScaleX;
        };

        $rootScope.$on('printAreaToggled', function () {
            me.set({});
        });
    }
]);

'use strict';

angular.module('designstudioApp')
    .service('DesignItem', ['$rootScope', '$window', 'config', function DesignItem($rootScope, $window, config) {
        var me = this;

        me.item = {printAreas: []};
        me.color = {};

        me.etl = function (design) {
          design.designItems.forEach(function (item) {
            me.transformItem(item);

            for (var i = 0; i < item.colors.length; i++) {
              me.filterCompanionSizes(item.catalogItemId, item.colors[i]);
            }
          });

          me.item = design.designItems[0];

          if (me.item) {
            me.color = me.item.colors[0];
          }

          $rootScope.$broadcast('catalogItemSet', me.item);
          $rootScope.$broadcast('catalogColorSet', me.color);
        };

        me.filterCompanionSizes = function (catalogItemId, color) {

          _.each(color.sizes, function (size, index, sizes) {
            if (catalogItemId == size.catalogItemId) {

              if (size.sizeType !== 'Tall') {
                color.sizes = _.filter(color.sizes, function (size) {
                  if (size.sizeType != 'Tall') {
                    return true;
                  }
                });
              }

              if (size.sizeType !== 'Youth' && size.sizeType !== 'Toddler') {
                color.sizes = _.filter(color.sizes, function (size) {
                  if (size.sizeType != 'Toddler') {
                    return true;
                  }
                });
              }
            }
          });

        };

        me.getQuantityOfItem = function (item) {
          var count = 0;

          item.colors.forEach(function (color) {
            count += me.getQuantity(color.sizes);
          });

          return count;
        };

        me.getQuantity = function (sizeGroups) {
            var count = 0;

            if (_.isEmpty(sizeGroups)) {
              return count;
            }

            for (var i = sizeGroups.length - 1; i >= 0; i--) {
              for (var j = sizeGroups[i].sizes.length - 1; j >= 0; j--) {
                count += parseInt(sizeGroups[i].sizes[j].quantity, 10) || 0;
              }
            }

            return count;
        };

        me.resetQuantity = function (designItems) {
          for (var i = designItems.length - 1; i >= 0; i--) {
            for (var j = designItems[i].colors.length - 1; j >= 0; j--) {
              for (var k = designItems[i].colors[j].sizes.length - 1; k >= 0; k--) {
                for (var l = designItems[i].colors[j].sizes[k].sizes.length - 1; l >= 0; l--) {
                  designItems[i].colors[j].sizes[k].sizes[l].quantity = 0;
                }
              }
            }
          }

          return designItems;
        };

        me.switchItemColor = function (item, color) {
          color = color ? color : item.colors[0];
          me.item = item;
          me.switchColor(color);
          $rootScope.$broadcast('catalogItemSet', me.item);
        };

        me.setItem = function (catalogItem) {
          var newColor, matches;

          catalogItem.availableColors = catalogItem.availableColors.map(function (color) {
            color = me.prepNewColor(color);
            me.filterCompanionSizes(catalogItem.catalogItemId, color);

            return color;
          });

          var existingColors = me.item.colors.filter(function (color) {
            return catalogItem.availableColors.find(function (availableColor) {
              return me.doesColorMatch(availableColor, color);
            });
          });

          catalogItem.colors = existingColors.map(function (oldColor) {
            var newColor = catalogItem.availableColors.find(function (availableColor) {
              return me.doesColorMatch(availableColor, oldColor);
            });

            newColor = me.transferColor(oldColor, newColor);

            return angular.extend(oldColor, newColor);
          });

          if (catalogItem.colors.length === 0 && me.item.colors.length === 1) {
            matches = [{
              existing: me.item.colors[0],
              available: catalogItem.availableColors[0]
            }];

            if (me.hasMatchingSizes(matches)) {
              catalogItem.colors = me.item.colors.map(function (oldColor) {
                var newColor = catalogItem.availableColors[0];

                newColor = me.transferColor(oldColor, newColor);

                return angular.extend(oldColor, newColor);
              });
            }
          }

          if (catalogItem.colors.length === 0) {
            newColor = me.prepNewColor(catalogItem.availableColors[0]);
            catalogItem.colors.push(newColor);
          }

          catalogItem.id = null;
          catalogItem.info = null;

          me.transformItem(catalogItem);
          me.item = angular.extend(me.item, catalogItem);

          me.color = me.item.colors[0];

          $rootScope.$broadcast('catalogColorSet', me.color);
          $rootScope.$broadcast('catalogItemSet', me.item);
        };

        me.doesColorMatch = function (a, b) {
          return a.name.toLowerCase() === b.name.toLowerCase()
        };

        me.hasAllMatchingSizes = function (designItem, catalogItem) {
          var matches = designItem.colors.map(function (designColor) {
            var color = catalogItem.availableColors.find(function (availableColor) {
              return me.doesColorMatch(availableColor, designColor);
            });

            return {existing: designColor, available: color};
          });

          return me.hasMatchingSizes(matches);
        };

        me.hasMatchingSizes = function(matches) {
          return matches.every(function (match) {
            if (!match.available) {
              return false;
            }

            return match.existing.sizes.every(function (sizeType) {
              var withQuantity = sizeType.sizes.filter(function (size) {
                return parseInt(size.quantity, 10) > 0;
              });

              return withQuantity.filter(function (size) {
                return me.hasSize(match.available.sizes, size, sizeType.sizeType);
              }).length === withQuantity.length;
            });
          });
        }

        // changes the active color
        me.switchColor = function (color) {
          me.filterCompanionSizes(me.item.catalogItemId, color);
          me.color = color;

          $rootScope.$broadcast('catalogColorSet', me.color);
        };

        // changes an existing color and transfer existing size info
        me.setColor = function (color) {
          color = me.transferColor(me.color, color);

          me.filterCompanionSizes(me.item.catalogItemId, color);
          me.color = angular.extend(me.color, color);

          $rootScope.$broadcast('catalogColorSet', me.color);
        };

        me.transferColor = function (oldColor, color) {
          var existingGroup = {}, existingSize = {};

          color = angular.copy(color, {});

          for (var i = color.sizes.length - 1; i >= 0; i--) {
            existingGroup = _.findWhere(oldColor.sizes, {sizeType: color.sizes[i].sizeType});

            if (_.isEmpty(existingGroup) === false) {
                for (var j = color.sizes[i].sizes.length - 1; j >= 0; j--) {
                    existingSize = _.findWhere(existingGroup.sizes, {catalogItemSizeId: color.sizes[i].sizes[j].catalogItemSizeId});

                    if (!existingSize) {
                      existingSize = _.findWhere(existingGroup.sizes, {sizeCode: color.sizes[i].sizes[j].sizeCode});
                    }

                    if (_.isEmpty(existingSize) === false) {
                        color.sizes[i].sizes[j].designItemSizeId = existingSize.designItemSizeId;
                        color.sizes[i].sizes[j].namesList = existingSize.namesList;
                        color.sizes[i].sizes[j].quantity = existingSize.quantity;
                    }
                }
            } else {
              for (var j = color.sizes[i].sizes.length - 1; j >= 0; j--) {
                color.sizes[i].sizes[j].namesList = [];
              }
            }
          }

          return color;
        };

        me.addColor = function (color) {
          color = me.prepNewColor(color);

          me.filterCompanionSizes(me.item.catalogItemId, color);
          me.item.colors.push(color);

          return color;
        };

        me.prepNewColor = function (color) {
          color = angular.copy(color, {});

          for (var i = 0; i < color.sizes.length; i++) {
            for (var j = color.sizes[i].sizes.length - 1; j >= 0; j--) {
              color.sizes[i].sizes[j].namesList = [];
            }
          }

          return color;
        };

        me.removeColorFromItem = function (designItem, color) {
          designItem.colors.splice(designItem.colors.indexOf(color), 1);

          if (designItem.colors.length > 0 && me.item.catalogItemId == designItem.catalogItemId && me.color.id == color.id) {
            me.switchColor(me.item.colors[0]);
          }
        };

        me.removeColor = function (color) {
          me.item.colors.splice(me.item.colors.indexOf(color), 1);
          me.color = me.item.colors[0];

          $rootScope.$broadcast('catalogColorSet', me.color);
        };

        me.hasColor = function (color) {
          for (var i = 0; i < me.item.colors.length; i++) {
            if (me.item.colors[i].id == color.id) {
              return true;
            }
          }

          return false;
        };

        me.getAvailableSizes = function () {
          var size = {};
          var availableSizes = {};
          var possibleSizes = me.getSizeRanges(me.item.availableColors);

          for(var sizeType in possibleSizes) {
              if(angular.isUndefined(availableSizes[sizeType])) {
                availableSizes[sizeType] = {name: sizeType};
                availableSizes[sizeType].sizes = [];
              }

              for (var i = possibleSizes[sizeType].sizes.length - 1; i >= 0; i--) {
                size = angular.copy(possibleSizes[sizeType].sizes[i]);

                size.available = me.hasSize(me.color.sizes, size, sizeType);
                availableSizes[sizeType].sizes.push(size);
              }
          }

          availableSizes = _.filter(availableSizes, function (sizeType) {
            return _.filter(sizeType.sizes, function (size) {
              return size.available;
            }).length;
          });

          for (var i = availableSizes.length - 1; i >= 0; i--) {
            availableSizes[i].sizes = _.sortBy(availableSizes[i].sizes, function (size) {
              return size.sortOrder;
            });
          }

          availableSizes.reverse();

          return availableSizes;
        };

        me.getSizeRanges = function (colors) {
          var sizeType;
          var existing;
          var sizeGroups = {};

          for (var i = colors.length - 1; i >= 0; i--) {
            for (var j = colors[i].sizes.length - 1; j >= 0; j--) {

              sizeType = colors[i].sizes[j].sizeType;

              if(angular.isUndefined(sizeGroups[sizeType])) {
                sizeGroups[sizeType] = {};
                sizeGroups[sizeType].sizes = [];
              }

              for (var k = colors[i].sizes[j].sizes.length - 1; k >= 0; k--) {
                existing = _.findWhere(sizeGroups[sizeType].sizes, {id: colors[i].sizes[j].sizes[k].catalogItemSizeId});

                if (angular.isUndefined(existing)) {
                  sizeGroups[sizeType].sizes.push({
                    sortOrder: colors[i].sizes[j].sizes[k].sortOrder,
                    code: colors[i].sizes[j].sizes[k].sizeCode,
                    id: colors[i].sizes[j].sizes[k].catalogItemSizeId
                  });
                }
              }
            }
          }

          for (sizeType in sizeGroups) {
            sizeGroups[sizeType].sizes = _.sortBy(sizeGroups[sizeType].sizes, function (size) {
              return size.sortOrder;
            });
          }

          return sizeGroups;
        };

        me.hasSize = function (sizes, size, sizeType) {
          for (var i = sizes.length - 1; i >= 0; i--) {
            for (var j = sizes[i].sizes.length - 1; j >= 0; j--) {
              if ((sizes[i].sizes[j].catalogItemSizeId == size.id || sizes[i].sizes[j].sizeCode == size.sizeCode) && sizeType === sizes[i].sizeType) {
                return true;
              }
            }
          }

          return false;
        };

        me.getFocusArea = function () {
          var focus = {};

          focus.width = 550 * (1200/1080);
          focus.height = 568 * (1130/1017.225);
          focus.ratio = focus.width / focus.height;
          // focus.yoffset = -249;

          return focus;
        };

        me.getProductItemUrl = function(style, colorCode) {
          return style ? config.catalogURL + '/items/' + style.toLowerCase() + '_' + colorCode + '.jpg' : null;
        };

        me.getProductImageUrl = function(style, sideCode, colorCode) {
          var url = config.catalogURL;

          if (!style || !sideCode || !colorCode) {
            return null;
          }

          if (style.toLowerCase() === 'g200') {
            url += '/productbeta/';
          } else {
            url += '/productjpg/';
          }

          return url + style.toLowerCase() + '_' + sideCode.toLowerCase() + '_' + colorCode + '.jpg';
        };

        me.getProductMaskUrl = function (style, sideCode) {
          if (!style || !sideCode) {
            return null;
          }

          return config.catalogURL + '/productmask/' + style.toLowerCase() + '_' + sideCode.toLowerCase() + '_mask.png';
        };

        me.getProductTextureUrl = function (style, sideCode) {
          if (!style || !sideCode) {
            return null;
          }

          return config.catalogURL + '/productmask/' + style.toLowerCase() + '_' + sideCode.toLowerCase() + '_texture.png';
        };

        me.getProductMaskTextureURL = function (maskTexture) {
          var url = config.catalogURL + '/productmask/';

          if (maskTexture) {
            return url + me.color.maskTexture;
          } else {
            return null;
          }
        };

        me.hasSizeChart = function (style) {
          var styles = ['g200', 'g500', 'g800'];

          return style ? styles.indexOf(style.toLowerCase()) > -1 : false;
        };

        me.openSizeChart = function (style) {
          var w;

          if (style) {
            w = $window.open('/siteimages/sizecharts/' + style.toLowerCase() + '.png',
              '_blank',
              'width=900,height=506,resizable=yes,scrollbars=yes,status=no,menubar=no,toolbar=no,location=no'
            );
          }
        };

        me.getSides = function (methodCode) {
          return me.item.printAreas.filter(function (printArea) {
            return printArea.printMethods.some(function (printMethod) {
              return printMethod.printMethodCode === methodCode;
            });
          });
        };

        me.getGuides = function (methodCode, sideCode) {
          for (var i = me.item.printAreas.length - 1; i >= 0; i--) {
            if (me.item.printAreas[i].code === sideCode) {
              for (var j = me.item.printAreas[i].printMethods.length - 1; j >= 0; j--) {
                if (me.item.printAreas[i].printMethods[j].printMethodCode === methodCode) {
                  return me.item.printAreas[i].printMethods[j].printAreaPrintGuides;
                }
              }
            }
          }

          return [];
        };

        me.getPrintMethodsCodes = function () {
          return me.item.printAreas.map(function (pa) {
            return pa.printMethods;
          }).reduce(function (a, b) {
            return a.concat(b);
          }, []).map(function (pm) {
            return pm.printMethodCode;
          }).filter(function (pm, index, pms) {
            return pms.indexOf(pm) === index;
          });
        };

        me.transformItem = function(item) {
          item.catalogLabel = item.ourLabel ? item.ourLabel : item.catalogLabel;

          item.printAreas.forEach(function (printArea) {
            printArea.code = printArea.printAreaTemplateCode || printArea.code;
            printArea.description = printArea.printAreaTemplateDescription || printArea.description;

            delete printArea.printAreaTemplateCode;
            delete printArea.printAreaTemplateDescription;

            printArea.printMethods.forEach(function (printMethod) {
              printMethod.printAreaPrintGuides.forEach(function (guide) {
                  guide['default'] = parseInt(guide['default'], 10);
                  guide.x = parseFloat(guide.x);
                  guide.y = parseFloat(guide.y);
                  guide.width = parseFloat(guide.width);
                  guide.height = parseFloat(guide.height);
              });
            });
          });
        }
    }
]);

'use strict';

angular.module('designstudioApp')
    .service('InkColors', [function InkColors() {
        var me = this;
        var shirtColor;

        me.data = [];
        me.process = [];

        me.etl = function (designData) {
          me.extract(designData.availableInkColors);
        };

        me.extract = function (availableInkColors) {
          var special = availableInkColors.filter(isSpecial);
          var normal = availableInkColors.filter(function(color){
              return isProcess(color) === false && isSpecial(color) === false && isShirtColor(color) === false;
            }
          );

          me.data = normal.concat(special);
          me.process = availableInkColors.filter(isProcess);
          shirtColor = availableInkColors.filter(isShirtColor).shift();
        };

        me.isSpecial = isSpecial;
        me.isFlo = isFlo;
        me.isMetallic = isMetallic;
        me.isNotShirtColor = isNotShirtColor;
        me.isShirtColor = isShirtColor;
        me.getShirtColor = getShirtColor;

        function isSpecial(color) {
          return isFlo(color) || isMetallic(color);
        }

        function isProcess(color) {
          return hasPrefix(color.name, 'process');
        }

        function isFlo(color) {
          return hasPrefix(color.name, 'fluorescent');
        }

        function isMetallic(color) {
          return hasPrefix(color.name, 'liquid');
        }

        function isNotShirtColor(color) {
          return isShirtColor(color) === false;
        }

        function isShirtColor(color) {
          return color.code === 'sc';
        }

        function getShirtColor() {
          return angular.copy(shirtColor);
        }

        function hasPrefix(name, prefix) {
          name = name || '';

          return name.split(' ').shift().toLowerCase() === prefix;
        }
    }
]);

'use strict';

angular.module('designstudioApp')
    .service('Fonts', [function Fonts() {
      var me = this;
      var fonts = {
        all: [],
        vinyl: []
      };

      me.data = [];
      me.categories = [];

      me.etl = function (designData) {
        var fontData = {};

        me.categories = [];

        angular.forEach(designData.availableFonts, function (fonts, category) {
          me.categories.push(category);

          fontData[category] = _.sortBy(fonts, function (font) {
            return font.alias;
          });
        });

        me.categories.reverse();

        angular.forEach(fontData, function (fonts, category) {
          angular.forEach(fonts, function (font, index) {
            font.preview = font.name.replace(/\s|[^a-z0-9_().-]/gi, '_');
          });
        });

        me.data = fontData;

        fonts.all = fontData;
        fonts.vinyl = designData.availableVinylFonts;
      };

      me.getCategory = function (fontName) {
        var found, categoryName = _.findWhere(me.data['Popular'], {name: fontName});

        if (angular.isUndefined(categoryName)) {

          for(var category in me.data){
            found = _.findWhere(me.data[category], {name: fontName});

            if (angular.isDefined(found)) {
              categoryName = category;

              break;
            }

          }

          return categoryName;

        } else {
          return 'Popular';
        }

			};

      me.getVinylFonts = function () {
        return fonts.vinyl;
      };

		}
]);

'use strict';

angular.module('designstudioApp')
  .directive('printObject', ['$rootScope', '$timeout', 'PrintArea', 'PrintObject', 'PrintObjectPopover', 'Viewport', function ($rootScope, $timeout, PrintArea, PrintObject, PrintObjectPopover, Viewport) {
    return {
      templateUrl: 'views/printobject/print.html?ts='+Date.now(),
      restrict: 'E',
      scope: true,
      replace: true,
      require: '^printArea',
      controller: ['$scope', '$element', '$attrs', function($scope, $element, $attrs) {

        this.setPosition = function setPosition(position) {
          $element.css({
            top: position.top,
            left: position.left
          });
        };

        this.addClass = function addClass(className) {
          $element.addClass(className);
        };

        this.removeClass = function removeClass(className) {
          $element.removeClass(className);
        };
      }],

      link: function postLink(scope, element, attrs, printAreaCtrl) {
        var startScaleX, startScaleY, startX, startY, recoupLeft, recoupTop;
        var enableSnapToCenter = true;
        var startSnapClientX = null;
        var startPrintObject = false;

        scope.useOrigUpload = useOrigUpload;
        scope.popoverIsVisible = popoverIsVisible;
        scope.PrintObject = PrintObject;

        scope.hasClippingMask = PrintArea.hasClippingMask;

        function useOrigUpload() {
          if (scope.printObject.type !== 'uploadobject') {
            return false;
          }

          return scope.previewConfig.getPDF === true;
        }

        function popoverIsVisible() {
          return PrintObjectPopover.isVisible(element);
        }

        //recoupLeft & recoupTop fixes jqueryui draggable and transform bug
        scope.startCallback = function(event, ui) {
          if (scope.printObject.type === 'clippingobject') {
            return false;
          }

          var guides, largestGuide;
          var left = parseFloat(element.css('left'));
          var top = parseFloat(element.css('top'));
          var clippingElement = angular.element('.clippingobject');

          left = isNaN(left) ? 0 : left;
          top = isNaN(top) ? 0 : top;

          recoupLeft = left - ui.position.left;
          recoupTop = top - ui.position.top;

          startX = ui.position.left;
          startY = ui.position.top;

          printAreaCtrl.showBorder();
          checkGuides();
          startPrintObject = scope.printObject;

          if (clippingElement.length) {
            if (clippingElement.scope().printObject.zIndex > scope.printObject.zIndex) {
              clippingElement.css('zIndex', 10000);
            }
          }

          if (Viewport.isExtraSmall() === false) {
            PrintObject.set(scope.printObject);
          }

          printAreaCtrl.setIsMoving(true);
          scope.$apply();
        };

        scope.dragCallback = function (event, ui) {
          ui.position.left += recoupLeft;
          ui.position.top += recoupTop;

          printAreaCtrl.showBorder();

          if (enableSnapToCenter && event.shiftKey === false) {
            doSnapToCenter(event, ui);
          }

          checkGuides();

          scope.$digest();
        };

        scope.stopCallback = function(event, ui) {
          var clippingElement = angular.element('.clippingobject');

          scope.printObject.x += (ui.position.left - startX) / scope.display.scale / scope.workspace.scale;
          scope.printObject.y += (ui.position.top - startY) / scope.display.scale / scope.workspace.scale;

          if (startPrintObject !== scope.printObject) {
            PrintObject.set(scope.printObject, Viewport.isExtraSmall());
          }

          printAreaCtrl.warnContainment();
          angular.element('.print-area-guide').removeClass('centered').removeClass('exactly-centered');
          startSnapClientX = null;

          if (clippingElement.length) {
            clippingElement.css('zIndex', clippingElement.scope().printObject.zIndex);
          }

          printAreaCtrl.setIsMoving(false);
          scope.$apply();
        };

        scope.selectPrintObject = function selectPrintObject(printObject) {
          PrintObject.set(printObject, Viewport.isExtraSmall());
        };

        scope.isRotated = isRotated();

        scope.isActivePrintObject = PrintObject.isEqual(scope.printObject);

        if (scope.isActivePrintObject) {
          if (scope.printObject.type === 'textobject' && scope.printObject.details.text.length === 0) {
            scope.isActivePrintObject = false;
          }
        }

        if (scope.isActivePrintObject) {
          $timeout(function() {
            PrintObjectPopover.show(element);
          }, 0);
        }

        scope.$on('printObjectSet', function (event, printObject) {
          scope.isActivePrintObject = PrintObject.isEqual(scope.printObject);

          if (scope.isActivePrintObject) {
            $timeout(function() {
              PrintObjectPopover.show(element);
            }, 0);
          }
        });

        //jquery ui resizble has a regex bug https://github.com/jquery/jquery-ui/blob/master/ui/resizable.js
        //axis = this.className.match(/ui-resizable-(se|sw|ne|nw|n|e|s|w)/i);
        element.resizable({
            handles: {
              n: '.ui-resizable-n',
              e: '.ui-resizable-e',
              se: '.ui-resizable-se',
            },
            minHeight: 15,
            minWidth: 15,
            start: onStartResize,
            stop: onStopResize,
            resize: onResize,
            aspectRatio: false
        });

        element.children('.print-object-wrap').rotatable({
          angle: scope.printObject.rotation * (Math.PI / 180),
          handle: element.find('.ui-rotatable-handle'),
          rotate: function (event, ui) {
            scope.$apply(function () {
              scope.printObject.rotation = (ui.angle.current * (180 / Math.PI)) % 360;
              scope.isRotated = isRotated();
            });
          },
          start: function () {
            angular.element('#workspace').data('enableDeselect', false);
          },
          stop: function (event, ui) {
            // this small delay helps to prevent accidental printobject de-selection
            $timeout(function () {
              angular.element('#workspace').data('enableDeselect', true);
            }, 5);
          }
        });

        scope.$watch('printObject.rotation', function (newValue, oldValue) {
          if (newValue !== oldValue) {
            scope.isRotated = isRotated();
            element.children('.print-object-wrap').rotatable('angle', scope.printObject.rotation * (Math.PI / 180));
          }
        });

        scope.$watch('printObject.details.text.length', function (newValue, oldValue) {
          if (newValue !== oldValue && newValue > 0 && scope.isActivePrintObject === false) {
            scope.isActivePrintObject = true;
          }
        });

        scope.$on('$destroy', function () {
          $timeout(function () {
            printAreaCtrl.warnContainment();
          }, 0);
        });

        function onStartResize(event, ui) {
          var propartional = false;
          var handle = angular.element(event.originalEvent.target);

          if (handle.hasClass('ui-resizable-box')) {
            handle = handle.parent();
          }

          startScaleX = scope.printObject.scaleX;
          startScaleY = scope.printObject.scaleY;
          startX = parseFloat(element.css('left'));
          startY = parseFloat(element.css('top'));

          element.data('rotation', scope.printObject.rotation);
          angular.element('#workspace').data('enableDeselect', false);

          propartional = handle.hasClass('ui-resizable-corner') || handle.hasClass('ui-resizable-se');
          propartional = propartional && PrintObject.isProportionate();
          //this only works with jquery-ui-resizable-option-fix.js
          element.resizable("option", "aspectRatio", propartional);
        }

        function onResize(event, ui) {
          if (ui.position.top === ui.originalPosition.top) {
            angular.element(this).css({
              top: parseInt(ui.position.top, 10) + ((ui.originalSize.height - ui.size.height) / 2),
              left: parseInt(ui.position.left, 10) + ((ui.originalSize.width - ui.size.width) / 2)
            });
          } else {
            angular.element(this).css({
              top: ui.position.top + ((ui.originalPosition.top - ui.position.top) / 2),
            });
          }

          scope.printObject.scaleX = ui.size.width / ui.originalSize.width * startScaleX;
          scope.printObject.scaleY = ui.size.height / ui.originalSize.height * startScaleY;
        }

        function onStopResize(event, ui) {
          scope.$apply(function () {
            //reset element size
            element.width('');
            element.height('');

            scope.printObject.scaleX = ui.size.width / ui.originalSize.width * startScaleX;
            scope.printObject.scaleY = ui.size.height / ui.originalSize.height * startScaleY;

            $rootScope.$emit('printObjectResized', scope.printObject);

            // this small delay helps to prevent accidental printobject de-selection
            $timeout(function () {
              angular.element('#workspace').data('enableDeselect', true);
            }, 5);
          });
        }

        function isRotated() {
          var rotation = Math.abs(scope.printObject.rotation);

          if (rotation === 0) {
            return false;
          } else if (rotation - 360 === 0) {
            return false;
          } else {
            return true;
          }
        }

        function doSnapToCenter(event, ui) {
          var largest, guides;
          var snapLeash = 15;

          guides = angular.element('.print-area-guide').filter(function (index, pag) {
            return isNearCenter(element, pag, 2);
          });

          if (guides.length > 0) {
            largest = _.max(guides, function (pag) {
              return angular.element(pag).width();
            });

            largest = angular.element(largest);
            startSnapClientX = startSnapClientX || event.clientX;

            if (Math.abs(event.clientX - startSnapClientX) > snapLeash) {
              startSnapClientX = null;
            } else {
              ui.position.left = (parseFloat(largest.css('left')) + (largest.width() / 2)) - (element.width() / 2);
            }
          }
        }

        function checkGuides() {
          var nearCenter, largest;

          nearCenter = angular.element('.print-area-guide').filter(function (index, pag) {
            return isNearCenter(element, pag, 10);
          });

          if (nearCenter.length) {
            largest = _.max(nearCenter, function (pag) {
              return angular.element(pag).width();
            });

            angular.element(largest).addClass('centered');

            if (isNearCenter(element, largest, 2)) {
              angular.element(largest).addClass('exactly-centered');
            } else {
              angular.element(largest).removeClass('exactly-centered');
            }
          } else {
            angular.forEach(angular.element('.print-area-guide'), function (pag) {
              angular.element(pag).removeClass('centered').removeClass('exactly-centered');
            });
          }
        }

        function isNearCenter(poEl, paEl, buffer) {
          paEl = angular.element(paEl);
          buffer = angular.isDefined(buffer) ? buffer : 0;

          return isWithinY(poEl, paEl) && isXCenter(poEl, paEl, buffer);
        }

        function isWithinY(poEl, paEl) {
          return parseFloat(poEl.css('top')) >= parseFloat(paEl.css('top')) && parseFloat(poEl.css('top')) <= parseFloat(paEl.css('top')) + paEl.height();
        }

        function isXCenter(poEl, paEl, buffer) {
          var areaCenter = parseFloat(paEl.css('left')) + (paEl.width() / 2);
          var poCenter = parseFloat(poEl.css('left')) + (poEl.width() / 2);

          areaCenter = Math.round(areaCenter);
          poCenter = Math.round(poCenter);

          buffer = buffer * scope.display.scale * scope.workspace.scale;

          return poCenter === areaCenter || poCenter > (areaCenter - buffer) && poCenter < (areaCenter + buffer);
        }
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('textObject', ['$timeout', 'RenderQueue', 'DesignItem', 'TextObject', 'PrintObject', 'Circle', 'TextObjectLine', 'InkColors', function ($timeout, RenderQueue, DesignItem, TextObject, PrintObject, Circle, TextObjectLine, InkColors) {
        return {
            template: '<div style="position: relative; white-space: nowrap; pointer-events: none; line-height: normal;"></div>',
            restrict: 'E',
            replace: true,
            require: '^printArea',
            link: function postLink(scope, element, attrs, printAreaCtrl) {
              var draw = function () {
                var i, widestLine, largestRad, bounds, radialModifier, strokeColor;
                var scale = scope.display.scale * scope.workspace.scale;
                var textLines = scope.printObject.details.text.split(/\r\n|\r|\n/g);
                var fontSpace =  ((scope.printObject.details.fontSpace / 100) -1 ) * 0.635; //0.635 helps match flash ds spacing
                var fontConfig = {
                  fontColor: scope.printObject.details.inkColor.hex,
                  fontSize: scope.printObject.details.fontSize * scale,
                  fontFamily:'"' + scope.printObject.details.font.replace(/'/gi, '') + '"',
                  letterSpacing: fontSpace + 'em'
                };

                var align = scope.printObject.details.align;
                var strokeSize = parseInt(scope.printObject.outline.size, 10) / 2 * scale;
                var origAngle = scope.printObject.arc.angle == 0 ? 1 : scope.printObject.arc.angle;

                if (InkColors.isShirtColor(scope.printObject.outline.color) && scope.previewConfig.getPDF === false) {
                  strokeColor = DesignItem.color.maskHex || DesignItem.color.hex;
                } else {
                  strokeColor = scope.printObject.outline.color.hex;
                }

                if(origAngle>=360){
                    origAngle = 359;
                }
                if(origAngle<=-360){
                    origAngle = -359;
                }

                textLines = _.map(textLines, function fixEmptyLines(textLine) {
                  textLine = textLine.replace(/^\s+|\s+$/g, '');

                  return textLine.length > 0 ? textLine : ' ';
                });

                i = textLines.length - 1;

                textLines = _.map(textLines, function getTextLines(textLine) {
                  return _.extend({text: textLine}, TextObject.getFlatDimensions(textLine, fontConfig));
                });

                widestLine = _.max(textLines, function getWidestLine(line) {
                  return line.width;
                });

                largestRad = fontConfig.fontSize * i;

                element.empty();
                element.css('width', '');
                element.css('height', '');
                element.css('transform', '');
                element.parents('.print-object').css('width', '');
                element.parents('.print-object').css('height', '');
                element.parents('.print-object').css('transform', '');

                if (textLines.length === 0) {
                  RenderQueue.decrement();
                  return false;
                }


                var points = [];
                var peakCoordinates = {};
                var adjustY = 0;
                var adjustX = 0;

                textLines.forEach(function( textLine ) {
                  var tmpAngle = origAngle * (textLine.width / widestLine.width);
                  var radialModifier = fontConfig.fontSize * i;

                  i -= 1;

                  if (origAngle < 0) {
                    radialModifier = (textLines.length - 1 - i) * fontConfig.fontSize * -1;
                  } else {
                    radialModifier = (textLines.length - 1 - i) * fontConfig.fontSize;
                  }

                  var circumference = textLine.width * 360 / tmpAngle;
                  var radius = circumference / 2 / Math.PI + radialModifier;


                  var boundingCircle = new Circle(Math.abs(radius));
                  var baselineCircle = new Circle(Math.abs(radius) - textLine.height);



                  var coordinates, baselineCoordinates;


                  switch (align){
                    case 'alignLeft':

                       coordinates = boundingCircle.getArcCoordinates(tmpAngle, (origAngle - tmpAngle)/2);
                       baselineCoordinates = baselineCircle.getArcCoordinates(tmpAngle, (origAngle - tmpAngle)/2);

                   break;
                    case 'alignRight':
                       coordinates = boundingCircle.getArcCoordinates(tmpAngle, (tmpAngle - origAngle)/2);
                       baselineCoordinates = baselineCircle.getArcCoordinates(tmpAngle, (tmpAngle - origAngle)/2);

                    break;
                    case 'alignCenter':
                    default:
                        coordinates = boundingCircle.getArcCoordinates(tmpAngle, 0);
                        baselineCoordinates = baselineCircle.getArcCoordinates(tmpAngle, 0);

                    break;

                  }


                  if(i == textLines.length - 2){
                    peakCoordinates = baselineCircle.getPoint(270);
                  }

                  points.push(coordinates.dest);
                  points.push(baselineCoordinates.dest);
                  points.push(coordinates.origin);
                  points.push(baselineCoordinates.origin);
                });

                points = _.filter(points, function (point) {
                  return angular.isDefined(point);
                });

                if (points.length === 0) {
                  RenderQueue.decrement();
                  return false;
                }

                var highestPoint = _.min(points, function getHighestPoint(point) {
                  return point.y;
                });


                var getCircleBounds = function (textLines, angle, widestLine, lineSpacing, strokeSize) {
                  var strokeAdjust = strokeSize / 2;
                  var left = false, top = false, right = false, bottom = false;

                  textLines.forEach(function (textLine, index, textLines) {
                    var line, bounds;
                    var radialModifier = (textLines.length - index -1) * lineSpacing;
                    var adjustedAngle = angle * (textLine.width / widestLine.width);
                    var circumference  = adjustedAngle == 0 ? 0 : Math.abs((360 / adjustedAngle) * textLine.width);
                    var radius = circumference/(2 * Math.PI);

                    if(angle < 0){
                      radialModifier = index * lineSpacing;
                    }

                    radius += radialModifier;

                    line = new TextObjectLine({
                      text: textLine.text,
                      align: scope.printObject.details.align,
                      angle: adjustedAngle,
                      fullAngle: angle,
                      radialModifier: radialModifier,
                      radius: radius,
                      dimensions: {
                        width: textLine.width,
                        height: textLine.height
                      }
                    });

                    bounds = line.getBounds();

                    if(!bounds){
                        return true;
                    }

                    if(left === false || bounds.left < left){
                        left = bounds.left;
                    }
                    if(top === false || bounds.top < top){
                        top = bounds.top;
                    }
                    if(right === false || bounds.right > right){
                        right = bounds.right;
                    }
                    if(bottom === false || bounds.bottom > bottom){
                        bottom = bounds.bottom;
                    }
                  });

                  return {left:left, top:top, right:right, bottom:bottom};
                };


                var circleBounds = getCircleBounds(textLines, origAngle, widestLine, fontConfig.fontSize, strokeSize);

                adjustY = peakCoordinates.y - highestPoint.y;
                adjustX = (circleBounds.right - circleBounds.left) / 2;

                i = textLines.length - 1;

                textLines.forEach(function( textLine ) {
                    var div = angular.element('<div></div>');
                    var newAngle = origAngle * (textLine.width / widestLine.width);
                    var radialModifier = fontConfig.fontSize * i;

                    i -= 1;

                    if (origAngle < 0) {
                      radialModifier = (textLines.length - 1 - i) * fontConfig.fontSize * -1;
                    }

                    element.append(div);
                    renderEach({
                        element: div,
                        angle: newAngle,
                        scale: scope.display.scale * scope.workspace.scale,
                        textString: textLine.text,
                        spacing: fontSpace,
                        radialModifier: radialModifier,
                        largestRad: largestRad,
                        origAngle: origAngle,
                        highestPoint: highestPoint,
                        adjustY: adjustY,
                        adjustX: adjustX
                    });
                });


                bounds = TextObject.getBoundingBox(element.find('span'));

                element.css('width', bounds.width * Math.abs(scope.printObject.scaleX));
                element.css('height', (circleBounds.bottom - circleBounds.top) * Math.abs(scope.printObject.scaleY));
                element.find('span').css('pointer-events', 'auto');

                element.parents('.print-object').css({
                  top: -element.parents('.print-object').height() / 2 + ((scope.printObject.y) * scale),
                  left: -element.parents('.print-object').width() / 2 + ((scope.printObject.x) * scale),
                });


                var elementWidth = element.width();
                var elementHeight = element.height();

                element.css('transform', 'scale(' + scope.printObject.scaleX + ',' + scope.printObject.scaleY +')');

                var elementTop = (elementHeight * scope.printObject.scaleY - elementHeight) / 2;
                if( scope.printObject.scaleY <0){
                    elementTop +=elementHeight;
                }
                element.css({
                    top: elementTop,
                    left: elementWidth / 2 * scope.printObject.scaleX //(elementWidth  * scope.printObject.scaleX - elementWidth + bounds.width) / 2
                });

                if (printAreaCtrl) {
                  $timeout(function () {
                    printAreaCtrl.warnContainment();
                  }, 0);
                }

                if (strokeSize <= 0) {
                  RenderQueue.decrement();
                  return true;
                }

                var newLines = Array();

                element.children().each(function (index, line) {
                  newLines.push($(line).clone());
                });


                element.find('span').each(function (index, span) {
                  var span = $(span);
                  var text = span.text();
                  var width = span.width();
                  var height = span.height();
                  var id = _.uniqueId('textobject-svg-');
                  var svg, textElement, strokeElement;
                  var newSpan = span.clone();

                  var textConfig = {
                    // dy:'0.35em',
                    fill: '#' + strokeColor,
                    'text-anchor': 'middle',
                    'text-rendering': 'geometricPrecision'
                  };

                  span.empty();

                  span.append('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="display: block; position: absolute; vertical-align: top;" id="' + id + '"></svg>');
                  svg = Snap('#' + id);

                  svg.attr({
                    preserveAspectRatio: 'xMinYMin none',
                    version: '1.1',
                    baseProfile: 'full',
                    width: width + strokeSize + 'px',
                    height: height + strokeSize + 'px'
                  });

                  strokeElement = svg.text((width + strokeSize) / 2,0, text);//(height  + strokeSize) / 2
                  strokeElement.attr(textConfig);
                  strokeElement.attr({
                    stroke: '#' + strokeColor,
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round',
                    'stroke-width': strokeSize,
                  });
                  var bbox = strokeElement.getBBox();
                  strokeElement.attr({
                    'y': (( height + strokeSize) / 2 ) - bbox.cy
                  });

                  span.parent().append(newSpan);

                  span.css({
                    width: width,
                    height: height,
                    // border: '1px solid green'
                  });

                  span.find('svg').css({
                    left: -strokeSize / 2,
                    top: -(strokeSize / 2)
                    // fix this, three works in most cases, but is wrong
                  })
                });
                newLines.forEach(function(line){
                  element.append(line);
                });

                RenderQueue.decrement();
                // //37, 43
                //23, 29
                //35, 55

              };

              var renderEach = function (config) {
                var boundingBox, newArcLength, letterSpacing, indent, centerY, centerX;
                var id = _.uniqueId('textobject-');
                var element = config.element;
                var angle = config.angle === 0 ? 1 : config.angle;
                var origAngle = config.origAngle;
                var spacing = config.spacing;//-0.175 * Math.abs(angle) / 360;
                var scale = config.scale;

                var textString = config.textString;
                var fontSize = scope.printObject.details.fontSize * scale;
                var fontFamily = '"' + scope.printObject.details.font.replace(/'/gi, '') + '"';
                var fontColor = '#' + scope.printObject.details.inkColor.hex;

                var fontConfig = {
                  color: fontColor,
                  fontSize: fontSize,
                  fontFamily: fontFamily,
                  letterSpacing: spacing + 'em'
                };

                var flatDimensions = TextObject.getFlatDimensions(textString, fontConfig);
                var circumference = flatDimensions.width * 360 / angle;
                var radius = circumference / 2 / Math.PI + config.radialModifier;
                var align = scope.printObject.details.align.replace(/align/gi, '').toLowerCase();

                if (angle < 0) {
                  radius += fontSize * 0.35;
                }

                circumference = 2 * Math.PI * radius;
                newArcLength = circumference * (angle/360);
                letterSpacing = Math.abs(Math.round((newArcLength - flatDimensions.width)/(textString.length - 1)));

                fontConfig.letterSpacing = (spacing + (letterSpacing / fontSize)) + 'em';

                element.attr('id', id);
                element.text(textString);
                element.css(fontConfig);
                element.css({
                  width: 0,
                  height: 0
                });

                element[0].style.setProperty('color', fontConfig.color, 'important');

                if (align === 'right') {
                    // indent = circumference / (360 / origAngle * 2) * -1;
                    indent = ((origAngle - angle) / 360 * circumference * 1) / 2;
                } else if (align === 'left') {
                    indent = ((origAngle - angle) / 360 * circumference * -1) / 2;
                } else {
                    indent = 0;
                }

                centerY = 0;
                centerX = config.adjustX;

                if (angle >= 0) {
                  centerY += radius;
                  centerY -= config.radialModifier;
                  centerY += flatDimensions.height * 0.65;
                  centerY += config.largestRad;
                } else {
                  centerY += radius;
                  centerY -= config.radialModifier;
                  centerY += config.adjustY;
                }

                cssWarp({
                  targets: '#' + id,
                  // align: align,
                  fixshadow: false,
                  rotationMode: 'rotate',
                  indent: indent + 'px',
                  path: {
                    radius: radius,
                    textPosition: 'outside',
                    center: [0, centerY]
                  }
                });

                boundingBox = TextObject.getBoundingBox(element.children());

                element.css({
                  width: boundingBox.width,
                  height: boundingBox.height
                });

                if (scope.printObject.arc.angle === 0) {
                  var flat = _.min(element.children(), function (child) {
                    var transform, values;

                    child = angular.element(child);
                    transform = child.css('transform');
                    values = splitMatrix(transform);

                    return values[5];
                  });

                  var flatValues = splitMatrix(angular.element(flat).css('transform'));

                  angular.forEach(element.children(), function (child, index) {
                    var transform, values;

                    child = angular.element(child);
                    transform = child.css('transform');
                    values = splitMatrix(transform);
                    flatValues[1] = 0;
                    flatValues[4] = values[4];

                    child.css('transform', 'matrix(' + flatValues.join(', ')  + ')');
                  });
                }

                function splitMatrix(transform) {
                  var values = transform.split('(')[1];

                  values = values.split(')')[0];
                  values = values.split(',');

                  return values;
                }
              };

              var timeOutId = null;
              var rotateTimeOutId = null;
              var loadFont = function (fontName) {
                var fontName = fontName.replace(/'/gi, '');
                var fileName = fontName.toLowerCase();
                var newScale = scope.display.scale * scope.workspace.scale;

                var loadWebFont = function(fontName, fileName){
                  WebFont.load({
                    custom: {
                      families: [fontName],
                      urls: ['font-face/' + fileName + '/stylesheet.css']
                    },
                    active: function () {
                      scope.$apply(function () {
                        RenderQueue.increment();
                        draw();
                      });
                    }
                  });
                }


                fileName = fileName.replace(/[^\s^a-z0-9_.-]/gi, '');
                fileName = fileName.replace(/\s/gi, '_');

                $timeout.cancel(timeOutId);

                if(scope.previousScale === newScale){
                  timeOutId = $timeout(function () {
                    loadWebFont(fontName, fileName);
                  }, 1);
                }else{
                  loadWebFont(fontName, fileName);
                }

                scope.previousScale = newScale;
              };

              scope.$watch(function () {
                return DesignItem.color.maskHex || DesignItem.color.hex;
              }, function () {
                if (scope.previewConfig.getPDF === false && InkColors.isShirtColor(scope.printObject.outline.color)) {
                  loadFont(scope.printObject.details.font);
                }
              }, true);

              scope.$watch('workspace.scale', function textWatchScale(newValue) {
                loadFont(scope.printObject.details.font);
              }, true);

              scope.$watch('printObject', function textWatchPrintObject(newValue, oldValue) {
                $timeout.cancel(rotateTimeOutId);

                if (newValue.rotation == oldValue.rotation) {
                  loadFont(scope.printObject.details.font);
                } else {
                  rotateTimeOutId = $timeout(function () {
                    loadFont(scope.printObject.details.font);
                  }, 10);
                }
              }, true);

              scope.$watch('isActivePrintObject', function textWatchIsActivePrintObject(newValue, oldValue) {
                if (newValue) {
                  element.parents('.print-object').css('pointer-events', 'auto');
                } else {
                  element.parents('.print-object').css('pointer-events', 'none');
                }
              });

              scope.$on("$destroy", function onDestroy(event) {
                  $timeout.cancel(timeOutId);
                }
              );
            }
        };
    }
]);


(function(angular) {
  'use strict';

  angular.module('designstudioApp').directive('uploadObject', ['$timeout', 'UploadObject', 'UploadObjectImage', 'UploadObjectCanvas', 'Color', 'RenderQueue', 'UploadPalette', uploadObject]);

  function uploadObject($timeout, UploadObject, UploadObjectImage, UploadObjectCanvas, Color, RenderQueue, UploadPalette) {
    var directive = {
      link: link,
      restrict: 'E',
      replace: true,
      scope: false,
      require: ['^printObject', '^printArea'],
      template: '<canvas class="upload-object"></canvas>'
    };

    return directive;

    function link(scope, element, attrs, controllers) {
      var clippedCanvas, removeColorWorker, swapColorWorker;
      var Palette = [];
      var image = new Image();
      var canvas = element[0];
      var context = canvas.getContext('2d');
      var printObjectCtrl = controllers[0];
      var printAreaCtrl = controllers[1];
      var imageURL = UploadObjectImage.getFilePreviewUrl(scope.printObject);
      var isMostlyWhite = false;
      var isRendering = true;
      var hasPaletteSupport = UploadPalette.hasPaletteSupport();

      image.src = imageURL;
      image.onload = onImageLoad;
      image.crossOrigin = "Anonymous";

      RenderQueue.increment();
      printObjectCtrl.addClass('working');

      function onImageLoad() {
        UploadObjectImage.isUploadMostlyWhite(scope.printObject).then(function (response) {
          isMostlyWhite = response.isMostlyWhite;
          onImageCheck();
        }, onImageCheck);
      }

      function onImageCheck() {
        if (hasPaletteSupport) {
          getPalette();
        } else {
          startCanvas();
        }

        function getPalette() {
          return UploadPalette.getPaletteFromUpload(scope.printObject).then(function (palette) {
            Palette = palette;
          }).then(startCanvas);
        }

        function startCanvas() {
          var multiColor = scope.printObject.details.multiColor;

          if (multiColor == 2 || multiColor == 1) {
            if (hasPaletteSupport) {
              setMultiColorCanvas().then(setup);
            } else {
              setMultiColorPalettelessCanvas();
              setup();
            }
          } else if (multiColor == 0) {
            setSingleColorCanvas();
            setup();
          } else if (multiColor == 3) {
            setGrayScaleCanvas();
            setup();
          }
        }
       }

      function setSingleColorCanvas() {
        var clipping = scope.printObject.details.clipping;
        var rgb = Color.hex2rgb(scope.printObject.details.inkColor.hex);

        if (isMostlyWhite) {
          clipping = clipping === 'ffffff' ? '000000' : 'ffffff';
        }

        clippedCanvas = UploadObjectCanvas.clipSingleColor(image, rgb, clipping, scope.printObject.threshold);
      }

      function setGrayScaleCanvas() {
        clippedCanvas = UploadObjectCanvas.grayScaleImage(image);
      }

      function setMultiColorCanvas() {
        var remove = UploadPalette.removeColor(image, scope.printObject.details.clippings, Palette);

        printObjectCtrl.addClass('working');

        if (removeColorWorker) {
          removeColorWorker.terminate();
        }

        if (swapColorWorker) {
          swapColorWorker.terminate();
        }

        removeColorWorker = remove.worker;

        return remove.then(function (removedCanvas) {
          var swap = UploadPalette.swapColor(removedCanvas, scope.printObject.details.swappings, Palette);

          swapColorWorker = swap.worker;

          return swap.then(function (swappedCanvas) {
            clippedCanvas = swappedCanvas;

            return clippedCanvas;
          });
        });
      }

      function setMultiColorPalettelessCanvas() {
        var clipping = scope.printObject.details.clipping;
        var rgb = Color.hex2rgb(scope.printObject.details.inkColor.hex);

        clippedCanvas = UploadObjectCanvas.clipMultiColor(image, clipping);
      }

      function setup() {
        updateBase();

        scope.$watch('[printObject.threshold, printObject.details.clipping]', onClipping, true);
        scope.$watch('printObject.details.inkColor.hex', onInkColor);
        scope.$watch('printObject.details.multiColor', onMultiColor);
        scope.$watchCollection('printObject.details.clippings', onClippings);
        scope.$watch('printObject.details.swappings', onClippings, true);
        scope.$watch(watchBase, updateBase, true);
      }

      function onClipping(newValue, oldValue) {
        if (newValue === oldValue) {
          return newValue;
        }

        if (scope.printObject.details.multiColor == 0) {
          setSingleColorCanvas();
          updateBase();
        } else if (scope.printObject.details.multiColor < 3 && hasPaletteSupport === false) {
          setMultiColorPalettelessCanvas();
          updateBase();
        }
      }

      function onInkColor(newValue, oldValue) {
        if (newValue === oldValue) {
          return newValue;
        }

        if (scope.printObject.details.multiColor == 0) {
          setSingleColorCanvas();
          updateBase();
        }
      }

      function onMultiColor(newValue, oldValue) {
        var multiColor = scope.printObject.details.multiColor;

        if (newValue === oldValue) {
          return newValue;
        }

        if (multiColor == 2 || multiColor == 1) {
          if (hasPaletteSupport) {
            setMultiColorCanvas().then(updateBase);
          } else {
            setMultiColorPalettelessCanvas();
            updateBase();
          }
        } else if (multiColor == 0) {
          setSingleColorCanvas();
          updateBase();
        } else if (multiColor == 3) {
          setGrayScaleCanvas();
          updateBase();
        }
      }

      function onClippings(newValue, oldValue) {
        if (newValue === oldValue) {
          return newValue;
        }

        setMultiColorCanvas().then(updateBase);
      }

      function watchBase() {
        return {
          scale: scope.workspace.scale,
          x: scope.printObject.x,
          y: scope.printObject.y,
          scaleX: scope.printObject.scaleX,
          scaleY: scope.printObject.scaleY,
        };
      }

      function updateBase() {
        updateSize();
        updatePosition();
        printObjectCtrl.removeClass('working');

        //only decrement and warn once.
        if (isRendering) {
          isRendering = false;
          RenderQueue.decrement();
          $timeout(function () {
            printAreaCtrl.warnContainment();
          }, 0);
        }
      }

      function updateSize() {
        var dims = getDimensions();

        canvas.width = dims.width;
        canvas.height = dims.height;
        context.drawImage(clippedCanvas, 0, 0, dims.width, dims.height);

        element.css({
          transform: 'scale(' + scope.printObject.scaleX / Math.abs(scope.printObject.scaleX) + ', ' + scope.printObject.scaleY / Math.abs(scope.printObject.scaleY) + ')'
        });
      }

      function updatePosition() {
        var dims = getDimensions();
        var x = -dims.width / 2 + (scope.printObject.x * dims.scale);
        var y = -dims.height / 2 + (scope.printObject.y * dims.scale);

        printObjectCtrl.setPosition({
          top: y,
          left: x,
        });
      }

      function getDimensions() {
        var dims = UploadObjectImage.getDimensions(image);
        var scale = scope.display.scale * scope.workspace.scale;
        var width = Math.round(dims.width * scale * Math.abs(scope.printObject.scaleX));
        var height = Math.round(dims.height * scale * Math.abs(scope.printObject.scaleY));

        return {
          width: width,
          height: height,
          scale: scale
        };
      }
    }
  }
})(angular);

'use strict';

angular.module('designstudioApp')
  .directive('menuSub', [function () {
    return {
      templateUrl: 'views/menu/sub.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: false,
      link: function postLink(scope, element, attrs) {
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('menuUpload', [function () {
    return {
      templateUrl: 'views/menu/upload.html?ts='+Date.now(),
      restrict: 'E',
      scope: false,
      replace: true,
      link: function postLink(scope, element, attrs) {
      }
    };
  }]);

(function() {
  'use strict';

  angular.module('designstudioApp').controller('WorkSpaceCtrl', [
    '$scope', 'MainMenu', 'Design', 'DesignItem', 'PrintArea', 'PrintObject', 'display', 'CheckoutModal', 'QuantitiesModal', 'config', 'FileUploader', 'InkColors', 'Color', 'UploadModal', 'UploadPalette', WorkSpaceCtrl
  ]);

  function WorkSpaceCtrl ($scope, MainMenu, Design, DesignItem, PrintArea, PrintObject, display, CheckoutModal, QuantitiesModal, config, FileUploader, InkColors, Color, UploadModal, UploadPalette) {
    var me = this;
    var getFocusArea = function () {
      if ($scope.zoomed) {
        return PrintArea.getFocusArea();
      } else if($scope.getPreview === true) {
        return {
          width: 1200,
          height: 1130,
          ratio: 1200 / 1130
        }
      } else {
        return DesignItem.getFocusArea();
      }
    };

    $scope.getPreview = false;
    $scope.previewConfig = {
      getPDF: false
    };

    $scope.Design = Design;
    $scope.PrintArea = PrintArea;
    $scope.display = display;
    $scope.DesignItem = DesignItem;
    $scope.PrintObject = PrintObject;
    $scope.hasDistress = Design.hasDistress;
    $scope.toggleDistress = Design.toggleDistress;
    $scope.isEmbroidery = Design.isEmbroidery;
    $scope.printAreas = Design.getSides();

    $scope.workspace = {
      width: 0,
      height: 0,
      scale: 1,
      multiSelectedObjects: []
    };

    $scope.zoomed = false;
    $scope.isUploading = false;
    $scope.showProductNote = true;

    $scope.focusArea = getFocusArea();

    $scope.openProductMenu = function () {
      MainMenu.setActive('editProduct');
    };

    $scope.toggleProductNote = function () {
      $scope.showProductNote = !$scope.showProductNote;
    };

    $scope.isOnLightGarment = function isOnLightGarment() {
      var hsv = DesignItem.color.hex ? Color.hex2hsv(DesignItem.color.hex) : {s:0, v: 0};

      return hsv.s > 50 || hsv.v < 50;
    };

    $scope.toggleZoom = function () {
      $scope.zoomed = !$scope.zoomed;
      $scope.focusArea = getFocusArea();
    };

    $scope.shouldShowDropover = function () {
      return (MainMenu.getActive() === 'addArt' && MainMenu.getAdvance() === 'uploadArt') || $scope.isUploading;
    };

    $scope.getProductCanvasDims = function () {
      var top = 0;

      top -= $scope.workspace.scale * $scope.display.product.yoffset;
      top += ($scope.workspace.height - ($scope.workspace.scale * $scope.display.product.height)) / 2;

      return {
        top: top,
        left: ($scope.workspace.width - ($scope.workspace.scale * $scope.display.product.width)) / 2
      }
    };

    $scope.getProductImageUrl = function () {
      var url = config.catalogURL;

      if (DesignItem.item && DesignItem.item.style && DesignItem.item.style.toLowerCase() === 'g200') {
        url += '/productbeta/';
      } else {
        url += '/productjpg/';
      }

      if (DesignItem.item && DesignItem.item.style) {
        url += DesignItem.item.style.toLowerCase() + '_';
      }

      if (PrintArea.data && PrintArea.data.code) {
        url += PrintArea.data.code.toLowerCase() + '_';
      }

      if (DesignItem.color && DesignItem.color.code) {
        url += DesignItem.color.code.toLowerCase() + '.jpg';
      }

      return url;
    };

    $scope.togglePrintArea = function () {
      PrintObject.set({});
      Design.togglePrintArea();
    };

    $scope.rotateIsActive = function() {
      return PrintArea.data.code != 'f';
    }

    $scope.printObjectCopyToOtherSide = function (printObject) {
      var dupe = PrintObject.duplicatePrintObject(printObject, printObject.y, PrintArea.getNewZIndex());
      Design.togglePrintArea();
      PrintArea.printObjectAdd(PrintArea.data.printObjects, dupe);
      PrintObject.set(dupe);
    };

    $scope.checkout = function () {
      if (Design.hasMinQuantity() && Design.isLowVolume() === false) {
        CheckoutModal.open();
      } else {
        QuantitiesModal.open();
      }
    };

    $scope.changePrintArea = function (code) {
      if (code !== PrintArea.data.code) {
        PrintObject.set({});
        Design.setPrintAreaSide(code);
      }
    };

    $scope.onFileDrop = function (files) {
      var file = files.slice(0, 1).shift();

      if (!file || !file.name) {
        return false;
      }

      $scope.isUploading = true;

      FileUploader.upload(file, config.uploadGatewayURL).then(function (fileObject) {
        addNewArt(fileObject);
        $scope.isUploading = false;
        $scope.uploadError = '';
      }, function (response) {
        $scope.uploadError = response;
      });
    };

    $scope.closeCover = function () {
      if ($scope.isUploading === false) {
        MainMenu.setActive(false);
      }

      $scope.isUploading = false;
      $scope.uploadError = '';
    };

    function addNewArt(fileObject) {
      var printObject;
      var template = PrintArea.getPrintObjectTemplate({type: 'upload'});

      template.file = fileObject;
      printObject = PrintObject.createUploadObject(template);

      if (Design.getPrintMethodCode() === 'emb') {
        printObject.details.multiColor = 2;
        printObject.details.inkColors = angular.copy(InkColors.process);
      }


      if (UploadPalette.hasPaletteSupport()) {
        UploadModal.open(printObject).opened.then(function () {
          MainMenu.setActive(false);
          $scope.isUploading = false;
        });
      } else {
        PrintArea.addPrintObject(printObject);

        if (Viewport.isExtraSmall()) {
          PrintObject.set(printObject, true);
          MainMenu.setActive(false);
        } else {
          PrintObject.set(printObject);
        }
      }

      $analytics.eventTrack('add art - uploaded image drag', {category: 'design studio'});
    }

    $scope.$on('printAreaToggled', function onPrintAreaToggled() {
      $scope.focusArea = getFocusArea();
      $scope.workspace.multiSelectedObjects.length = 0;
    });

    $scope.$on('designLoaded', function onDesignLoaded() {
      $scope.focusArea = getFocusArea();
      $scope.printAreas = Design.getSides();
    });

    $scope.$on('catalogItemSet', function onCatalogItemSet() {
      $scope.printAreas = Design.getSides();
      $scope.focusArea = getFocusArea();
    });

    $scope.$on('printMethodSet', function onCatalogItemSet() {
      $scope.printAreas = Design.getSides();
    });
  }

})();

'use strict';

angular.module('designstudioApp')
  .directive('menuClipart', [function () {
    return {
      templateUrl: 'views/menu/clipart.html?ts='+Date.now(),
      restrict: 'E',
      scope: false,
      replace: true
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('stepper', ['$analytics', function ($analytics) {
    return {
      templateUrl: 'views/common/stepper.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: {
          disabled: '=',
          min: '@',
          max: '@',
          step: '@',
          decimalPrecision: '<',
          size: '@',
          stepThreshold: '@',
          eventName: '@',
          eventLabel: '@'
      },
      require: '^ngModel',
      link: function postLink(scope, element, attrs, ngModelCrtl) {
        var inputField =  element.find('input');
        var config = {
          min: -Infinity,
          max: Infinity,
          step: 1,
          decimalPrecision: scope.decimalPrecision,
          stepThreshold: 0
        };

        attrs.$observe('min', function (value) {
          config.min = value ? parseFloat(value) : config.min;
        });

        attrs.$observe('max', function (value) {
          config.max = value ? parseFloat(value) : config.max;
        });

        attrs.$observe('step', function (value) {
          config.step = value ? parseFloat(value) : config.step;
        });

        attrs.$observe('stepThreshold', function (value) {
          config.stepThreshold = value ? parseFloat(value) : config.stepThreshold;
        });

        function cleanValue(value) {
          value = (value).toString().replace(/(?!^-)[^0-9.]/gi, '');

          if (value.length === 0 || (value).toString().replace(/[^0-9]/gi, '').length === 0) {
            value = 0;
          }

          if (value > config.max) {
            value = config.max;
          } else if (value < config.min) {
            value = config.min;
          }

          value = +parseFloat(value).toFixed(config.decimalPrecision);

          return value;
        };

        function stepUp() {
          var value = parseFloat(ngModelCrtl.$viewValue);
          var baseStep = config.step;
          var baseValue = value;

          for (var i = config.decimalPrecision - 1; i >= 0; i--) {
            baseStep = baseStep * 10;
            baseValue = baseValue * 10;
          }

          value = baseValue % baseStep === 0 ? value + config.step : value;
          value = Math.ceil((value + config.stepThreshold) / config.step) * config.step;
          value = cleanValue(value);

          ngModelCrtl.$setViewValue(value);
          ngModelCrtl.$render();

          if (angular.isDefined(scope.eventName) && angular.isDefined(scope.eventLabel)) {
            $analytics.eventTrack(scope.eventName, {category: 'design studio', label: 'increased ' + scope.eventLabel});
          }
        };

        function stepDown() {
          var value = parseFloat(ngModelCrtl.$viewValue);
          var baseStep = config.step;
          var baseValue = value;

          for (var i = config.decimalPrecision - 1; i >= 0; i--) {
            baseStep = baseStep * 10;
            baseValue = baseValue * 10;
          }

          value = baseValue % baseStep === 0 ? value - config.step : value;
          value = Math.floor((value - config.stepThreshold) / config.step) * config.step;
          value = cleanValue(value);

          ngModelCrtl.$setViewValue(value);
          ngModelCrtl.$render();

          if (angular.isDefined(scope.eventName) && angular.isDefined(scope.eventLabel)) {
            $analytics.eventTrack(scope.eventName, {category: 'design studio', label: 'decreased ' + scope.eventLabel});
          }
        };

        inputField.bind('blur', function inputBlur(event) {
          var value = event.currentTarget.value;

          value = cleanValue(value);

          ngModelCrtl.$setViewValue(value);
          ngModelCrtl.$render();
          scope.$apply();
        });

        ngModelCrtl.$render = function () {
          var value = cleanValue(ngModelCrtl.$viewValue);

          inputField.val(value);
        };

        ngModelCrtl.$viewChangeListeners.push(function () {
          if (ngModelCrtl.$viewValue <= config.min) {
            element.find('.glyphicon-minus').addClass('disabled');
          } else {
            element.find('.glyphicon-minus').removeClass('disabled');
          }

          if (ngModelCrtl.$viewValue >= config.max) {
            element.find('.glyphicon-plus').addClass('disabled');
          } else {
            element.find('.glyphicon-plus').removeClass('disabled');
          }
        });


        element.bind('keydown', function upArrow(event) {
          if (event.which == 38) {
            scope.$apply(stepUp);
          }
        });

        element.bind('keydown', function downArrow(event) {
          if (event.which == 40) {
            scope.$apply(stepDown);
          }
        });

        scope.minus = stepDown;
        scope.plus = stepUp;
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('selected', [function () {
    return {
      templateUrl: 'views/common/selected.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: {},
      transclude: true,
      link: function postLink(scope, element, attrs) {
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('buttonBack', [function () {
    return {
      templateUrl: 'views/common/buttonBack.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: {},
      link: function postLink(scope, element, attrs) {
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('buttonCommit', [function () {
    return {
      templateUrl: 'views/common/buttonCommit.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: {
        disabled: '='
      },
      transclude: true,
      link: function postLink(scope, element, attrs) {
      }
    };
  }]
);

(function() {
  'use strict';

  angular.module('designstudioApp').directive('clipartObject', ['DesignItem', 'ClipartObject', 'InkColors', '$timeout', 'display', 'RenderQueue', 'config', clipartObject]);

  function clipartObject(DesignItem, ClipartObject, InkColors, $timeout, display, RenderQueue, config) {
    var directive = {
      link: link,
      restrict: 'E',
      replace: true,
      scope: false,
      require: ['^printObject', '^printArea'],
      templateUrl: 'views/printobject/clipart.html?ts=' + Date.now()
    };

    return directive;

    function link(scope, element, attrs, controllers) {
      var isDownloaded = false;
      var printObjectCtrl = controllers[0];
      var printAreaCtrl = controllers[1];

      scope.$watch('printObject.details.src', onSrc);
      scope.$watch('printObject', reRender, true);
      scope.$watch('workspace.scale', onScale);
      scope.$watch(function () {
        return DesignItem.color.maskHex || DesignItem.color.hex;
      }, onItemColor);

      function onSrc(newValue, oldValue) {
        isDownloaded = false;
        RenderQueue.increment();
        Snap.load(config.clipartURL + '/' + scope.printObject.details.src + '.svg', onLoad);
      }

      function reRender(newValue, oldValue) {
        if (newValue.details.src === oldValue.details.src && isDownloaded) {
          render(Snap(element[0]).select('svg'));
        }
      }

      function onScale(newValue, oldValue) {
        if (isDownloaded) {
          render(Snap(element[0]).select('svg'));
        }
      }

      function onItemColor(newValue, oldValue) {
        if (isDownloaded && InkColors.isShirtColor(scope.printObject.outline.color) && scope.previewConfig.getPDF === false) {
          render(Snap(element[0]).select('svg'));
        }
      }

      function onLoad(Fragment) {
        var svg = Fragment.select('svg');
        var paper = Snap();
        var groups = svg.selectAll('g');
        var layerOne = groups[groups.length - 1]; // Assume the last group is the outline layer.

        if (angular.isUndefined(layerOne)) {
          layerOne = paper.g();

          svg.selectAll('*').forEach(function (child) {
            layerOne.add(child);
          });
        }

        layerOne.selectAll('*').forEach(function (child) {
          if (child.node.getAttribute('fill') !== 'none') {
            child.node.removeAttribute('fill');
          }
        });

        paper.append(layerOne);
        element.empty();
        Snap(element[0]).append(paper); //required for getBBox
        render(paper);
        isDownloaded = true;
      }

      function render(svg) {
        var svgDims = {};
        var svgViewBox = '';
        var outlineGroup;
        var groups = [];
        var layerOne, strokeColor;
        var stroke = scope.printObject.outline.size;
        var fullStroke = scope.printObject.outline.size * 2.65; //brute forced this constant to get the correct look.
        var maxSize = 100 * scope.display.scale * scope.workspace.scale;
        var clipartScale = {x: scope.printObject.scaleX, y: scope.printObject.scaleY};

        if (element.is(':visible') !== true || maxSize < 1) {
          return false;
        }

        if (InkColors.isShirtColor(scope.printObject.outline.color) && scope.previewConfig.getPDF === false) {
          strokeColor = DesignItem.color.maskHex || DesignItem.color.hex;
        } else {
          strokeColor = scope.printObject.outline.color.hex;
        }

        // Remove outline
        groups = svg.selectAll('g');
        layerOne = groups[groups.length - 1]; // Assume the last group is the first clipart layer.
        groups.exclude(layerOne);

        groups.forEach(function (group) {
          group.remove();
        });

        svgDims = ClipartObject.getSVGDims(layerOne.node.getBBox(), maxSize, clipartScale, fullStroke);
        svgViewBox = ClipartObject.getSVGViewBox(layerOne.node.getBBox(), clipartScale);

        svg.attr({
          preserveAspectRatio: 'xMinYMin none',
          version: '1.1',
          baseProfile: 'full',
          width: svgDims.width + 'px',
          height: svgDims.height + 'px',
          viewBox: svgViewBox,
        });

        layerOne.attr({
          fill: '#' + scope.printObject.details.inkColor.hex,
          transform: 'scale(' + clipartScale.x + ', ' + clipartScale.y + ')'
        });

        element.parent('.print-object').css({
          width: svgDims.width + 'px',
          height: svgDims.height + 'px'
        });

        if (scope.printObject.outline && scope.printObject.outline.size > 0) {
          outlineGroup = layerOne.clone();
          outlineGroup.attr({
            stroke: '#' + strokeColor,
            'stroke-width': fullStroke,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round'
          });

          svg.attr({
            viewBox: ClipartObject.getSVGStrokedViewBox(svgViewBox, clipartScale, stroke, fullStroke)
          });

          outlineGroup.insertBefore(layerOne);
        }

        if (printObjectCtrl) {
          printObjectCtrl.setPosition({
            top: scope.printObject.y * scope.display.scale * scope.workspace.scale - (svgDims.height / 2),
            left: scope.printObject.x * scope.display.scale * scope.workspace.scale - (svgDims.width / 2),
          });
        }

        if (printAreaCtrl) {
          $timeout(function () {
            printAreaCtrl.warnContainment();
          }, 0);
        }

        RenderQueue.decrement();
      }
    }
  }
})();

'use strict';

angular.module('designstudioApp')
  .service('ClipartObject', [function Clipart() {
    var me = this;

    me.fitToSize = function (dims, max) {
      var ratio = dims.width / dims.height;
      var newDims = {width: 0, height: 0};

      if(ratio >= 1) {
        newDims.width = max;
        newDims.height = max / ratio;
      } else {
        newDims.height = max;
        newDims.width = max / (1 / ratio);
      }

      return newDims;
    };

    me.getSVGDims = function (bBox, max, scale, fullStroke) {
      var dims;
      var scaleRatio;

      dims = me.fitToSize(bBox, max);
      dims.width *= Math.abs(scale.x);
      dims.height *= Math.abs(scale.y);

      scaleRatio = dims.width / bBox.width;

      dims.width += scaleRatio * fullStroke * Math.abs(scale.x);
      dims.height += scaleRatio * fullStroke * Math.abs(scale.y);

      return dims;
    };

    me.getSVGViewBox = function (bBox, scale) {
      var viewBox = [];
      var width = bBox.width * Math.abs(scale.x);
      var height = bBox.height * Math.abs(scale.y);

      if (scale.x > 0) {
        viewBox.push(bBox.x * Math.abs(scale.x));
      } else {
        viewBox.push(bBox.x * scale.x - width);
      }

      if (scale.y > 0) {
        viewBox.push(bBox.y * Math.abs(scale.y));
      } else {
        viewBox.push(bBox.y * scale.y - height);
      }

      viewBox.push(width);
      viewBox.push(height);

      return viewBox.join(' ');
    };

    me.getSVGStrokedViewBox = function (viewBox, scale, stroke, fullStroke) {
      var strokeViewBox = viewBox.split(' ');

      strokeViewBox[0] -= stroke * Math.abs(scale.x);
      strokeViewBox[1] -= stroke * Math.abs(scale.y);
      strokeViewBox[2] = 1 * strokeViewBox[2] + fullStroke * Math.abs(scale.x);
      strokeViewBox[3] = 1 * strokeViewBox[3] + fullStroke * Math.abs(scale.y);

      return strokeViewBox.join(' ');
    };

  }]
);

'use strict';

angular.module('designstudioApp')
  .controller('EditTextObjectCtrl', ['$scope', '$rootScope', 'Design', 'Clipart', 'PrintObject', 'InkColors', 'Fonts', 'config', '$analytics',
  function ($scope, $rootScope, Design, Clipart, PrintObject, InkColors, Fonts, config, $analytics) {
      var onPrintObjectResized =  $rootScope.$on('printObjectResized', function (event, printObject) {
        $scope.textMenu.textSize = Math.abs(printObject.scaleX);
      });

      $scope.fontCategory = 'View All';

      $scope.Fonts = Fonts;
      $scope.InkColors = InkColors;
      $scope.config = config;
      $scope.eventPrefix = 'font';
      $scope.isInkColorInUse = Design.isInkColorInUse;

      $scope.textMenu = {};
      $scope.textMenu.isMultiLine = isMultiLine(PrintObject.data.details.text);
      $scope.textMenu.textSize = Math.abs(PrintObject.data.scaleX);
      $scope.printObject = PrintObject.data;

      if (PrintObject.data.arc.angle == 0) {
        $scope.textMenu.activeTextShape = 'Normal';
      } else {
        $scope.textMenu.activeTextShape = 'Curve';
      }

      $scope.$on('printObjectSet', function (event, printObject) {
        $scope.textMenu.textSize = Math.abs(printObject.scaleX);

        if (printObject.arc && printObject.arc.angle == 0) {
          $scope.textMenu.activeTextShape = 'Normal';
        } else {
          $scope.textMenu.activeTextShape = 'Curve';
        }

        if (!printObject.type) {
          $scope.setActive(false);
          $scope.Design.deleteEmptyTextObjects();
        }
      });

      $scope.$watch('textMenu.textSize', function (newValue, oldValue) {
        if (newValue !== oldValue) {
          PrintObject.setSize(newValue);
        }
      });

      $scope.$watch('printObject.details.text', function (newValue, oldValue) {
        if (newValue !== oldValue) {
          $scope.textMenu.isMultiLine = isMultiLine(newValue);
        }
      });

      $scope.switchToGreek = function () {
        Clipart.newMode = true;
        Clipart.searchTerm = 'greek';
        $scope.setActive('addArt');
      };

      $scope.changeFontCategory = function (category) {
        $scope.fontCategory = category;
      };

      $scope.changeFont = function (type) {
        PrintObject.data.details.font = type.name;

        $analytics.eventTrack('font change - type', {category: 'design studio', label: type.name});
      };

      $scope.isActiveInkColor = function (inkColor) {
        return PrintObject.data.details.inkColorId == inkColor.id;
      };

      $scope.turnOutlineColorOff = function () {
        PrintObject.data.outline.size = 0;
      };

      $scope.isActiveOutlineColor = function (inkColor) {
        return PrintObject.data.outline.color.id == inkColor.id && PrintObject.data.outline.size > 0;
      };

      $scope.isOutlineColorOff = function () {
        return PrintObject.data.outline.size == 0;
      };

      $scope.changeTextColor = function (inkColor) {
        PrintObject.data.details.inkColorId = inkColor.id;
        PrintObject.data.details.inkColor = inkColor;

        $analytics.eventTrack('font change - color', {category: 'design studio', label: inkColor.name});
      };

      $scope.getFontAlias = function (fontName) {
        var font =  _.findWhere(Fonts.data['View All'], {name: fontName});

        return angular.isDefined(font) && font.alias ? font.alias : fontName;
      };

      $scope.colorOnEnter = function (color) {
        $scope.colorOnHover = color;
      };

      $scope.colorOnLeave = function () {
        $scope.colorOnHover = {};
      };

      $scope.$on('$destroy', onPrintObjectResized);

      function isMultiLine(text) {
        var lines;

        text = text.trim();
        lines = text.split(/\r\n|\r|\n/g);

        return lines.length > 1;
      }
   }]
);

'use strict';

angular.module('designstudioApp')
  .directive('menuDone', [function () {
    return {
      templateUrl: 'views/menu/done.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: false,
      link: function postLink(scope, element, attrs) {
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('menuProduct', [function () {
    return {
      templateUrl: 'views/menu/product.html?ts='+Date.now(),
      restrict: 'E',
      scope: false,
      replace: true
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('saveForm', [function () {
    return {
      templateUrl: 'views/menu/save/form.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs) {
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('printObjectToolbar', [function () {
    return {
      templateUrl: 'views/common/printObjectToolbar.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: false,
      link: function postLink(scope, element, attrs) {
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('sectionTitle', [function () {
    return {
      templateUrl: 'views/common/sectionTitle.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: {
        capitalize: '<'
      },
      transclude: true,
      link: function postLink(scope, element, attrs) {
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('sectionGroup', [function () {
    return {
      templateUrl: 'views/common/sectionGroup.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: false,
      transclude: true,
      link: function postLink(scope, element, attrs) {
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .controller('EditClipartObjectCtrl', ['$scope', '$rootScope', 'Design', 'Clipart', 'PrintObject', 'InkColors', function ($scope, $rootScope, Design, Clipart, PrintObject, InkColors) {
    var onPrintObjectResized =  $rootScope.$on('printObjectResized', function (event, printObject) {
      $scope.clipartMenu.clipartSize = Math.abs(printObject.scaleX);
    });

    $scope.InkColors = InkColors;
    $scope.PrintObject = PrintObject;
    $scope.isInkColorInUse = Design.isInkColorInUse;

    $scope.clipartMenu = {};
    $scope.clipartMenu.clipartSize = Math.abs(PrintObject.data.scaleX);

    $scope.eventPrefix = 'clipart';

    $scope.isActiveInkColor = function (inkColor) {
      return PrintObject.data.details.inkColorId == inkColor.id;
    };

    $scope.isActiveOutlineColor = function (inkColor) {
      return PrintObject.data.outline.color.id == inkColor.id && PrintObject.data.outline.size > 0;
    };

    $scope.isOutlineColorOff = function () {
      return PrintObject.data.outline.size == 0;
    };

    $scope.turnOutlineColorOff = function () {
      PrintObject.data.outline.size = 0;
    };

    $scope.changeClipartColor = function (inkColor) {
      PrintObject.data.details.inkColor = inkColor;
      PrintObject.data.details.inkColorId = inkColor.id;
    };

    $scope.newClipart = function () {
      Clipart.newMode = true;
      $scope.setActive('addArt');
    };

    $scope.swapClipart = function () {
      Clipart.swapMode = true;
      $scope.setActive('addArt');
    };

    $scope.colorOnEnter = function (color) {
      $scope.colorOnHover = color;
    };

    $scope.colorOnLeave = function () {
      $scope.colorOnHover = {};
    };

    $scope.$on('printObjectSet', function (event, printObject) {
      $scope.clipartMenu.clipartSize = Math.abs(printObject.scaleX);

      if (!printObject.type) {
        $scope.setActive(false);
      }
    });

    $scope.$watch('clipartMenu.clipartSize', function (newValue, oldValue) {
      if (newValue !== oldValue) {
        PrintObject.setSize(newValue);
      }
    });

    $scope.$on('$destroy', onPrintObjectResized);
  }]
);

'use strict';

angular.module('designstudioApp')
  .controller('EditUploadObjectCtrl', ['$scope', '$timeout', '$rootScope', 'PrintObject', 'InkColors', 'UploadMultiColor', 'Pricing', 'Design', 'StudioMode', 'UploadPalette',
    function ($scope, $timeout, $rootScope, PrintObject, InkColors, UploadMultiColor, Pricing, Design, StudioMode, UploadPalette) {
      var onPrintObjectResized =  $rootScope.$on('printObjectResized', function (event, printObject) {
        $scope.uploadMenu.uploadSize = Math.abs(printObject.scaleX);
      });

      $scope.uploadMenu = {};
      $scope.uploadMenu.uploadSize = Math.abs(PrintObject.data.scaleX);
      $scope.InkColors = InkColors;
      $scope.PrintObject = PrintObject;
      $scope.quickQuote = false;
      $scope.fullQuote = false;
      $scope.isEmbroidery = Design.getPrintMethodCode() === 'emb';
      $scope.isInkColorInUse = Design.isInkColorInUse;
      $scope.palette = [];
      $scope.activeSwap = {};

      $scope.uploadMenu.option = getUploadOption();
      $scope.uploadMenu.hasPaletteSupport = UploadPalette.hasPaletteSupport();
      $scope.uploadMenu.showPaletteWarning = false;
      $scope.uploadMenu.showPalette = showPalette;
      $scope.uploadMenu.gettingPalette = needsPalette();

      if ($scope.uploadMenu.gettingPalette) {
        loadPalette();
      }

      $scope.eventPrefix = 'upload';

      $timeout(function () {
        $scope.$broadcast('rzSliderForceRender');
      });

      $scope.setMultiColor = function () {
        var inkCount = 0;
        var option = $scope.uploadMenu.option;
        var multiColor = PrintObject.data.details.multiColor;
        var black = _.findWhere(InkColors.data, {name: 'Black'});
        var white = _.findWhere(InkColors.data, {name: 'White'});
        var gray = _.findWhere(InkColors.data, {name: 'Light Gray'});

        if (option == 1) {
          multiColor = 0;
        } else if (option < 7 || option == 9) {
          multiColor = 1;
          if ($scope.palette.length === 0) {
            loadPalette();
          }
        } else if (option == 7) {
          multiColor = 3;
        } else if (option == 8) {
          multiColor = 2;

          if ($scope.palette.length === 0) {
            loadPalette();
          }
        }

        PrintObject.data.details.clipping = 'ffffff';
        PrintObject.data.details.multiColor = multiColor;

        switch (multiColor) {
          case 0:
            PrintObject.data.details.inkColors = [];

            break;
          case 1:
            inkCount = option != 9 ? option : 1;
            PrintObject.data.details.inkColors = InkColors.process.slice(0, inkCount);

            break;
          case 2:
            PrintObject.data.details.inkColors = InkColors.process.slice();
            PrintObject.data.details.inkColors.push(black);

            break;
          case 3:
            PrintObject.data.details.inkColors = [black, white, gray];

            break;
        }
      };

      $scope.changeSingleColor = function (color) {
        PrintObject.data.details.inkColorId = color.id;
        PrintObject.data.details.inkColor = color;
      };

      $scope.changeMultiColor = function (color) {
        if ($scope.hasInkColor(color.id)) {

          if (PrintObject.data.details.inkColors.length > 0) {
            $scope.removeInkColor(color.id);
          }

          return true;
        }

        if (PrintObject.data.details.inkColors.length === 6) {
          PrintObject.data.details.inkColors.splice(0, 1);
        }

        PrintObject.data.details.inkColors.push(color);

        if ($scope.colorOnHover === color) {
          $scope.colorOnLeave();
        }

        return true;
      };

      $scope.hasInkColor = function (colorId) {
        var color = _.findWhere(PrintObject.data.details.inkColors, {id: (colorId)});

        return angular.isDefined(color);
      };

      $scope.removeInkColor = function (colorId) {
        var color = _.findWhere(PrintObject.data.details.inkColors, {id: (colorId)});

        PrintObject.data.details.inkColors = _.without(PrintObject.data.details.inkColors, color);
      };

      $scope.isActiveInkColor = function (inkColor) {
        return PrintObject.data.details.inkColorId == inkColor.id;
      };

      $scope.isSwapColorActive = function (color) {
        return angular.isDefined($scope.activeSwap.replacement) && color.hex.toLowerCase() === $scope.activeSwap.replacement.toLowerCase();
      };

      $scope.isNoSwapActive = function () {
        return angular.isUndefined($scope.activeSwap.replacement) || $scope.activeSwap.replacement.length === 0;
      };

      $scope.openMultiColorUpload = UploadMultiColor.openModal;

      $scope.closeMultiColorUpload = function () {
        $scope.uploadMenu.submitted = true;

        $scope.multiColorForm.$setValidity('quantity', true);

        if (PrintObject.data.details.inkColors.length < 2) {
          return $scope.multiColorForm.$setValidity('quantity', false);
        }

        UploadMultiColor.closeModal();
      };

      $scope.forceSingleColor = function () {
        if (PrintObject.data.details.inkColors.length === 1) {
          $scope.changeSingleColor(PrintObject.data.details.inkColors[0]);
        }

        PrintObject.data.details.multiColor = 0;
        UploadMultiColor.closeModal();
      };

      $scope.colorOnEnter = function (color) {
        if ($scope.hasInkColor(color.id) === false) {
          $scope.colorOnHover = color;
        }
      };

      $scope.colorOnLeave = function () {
        $scope.colorOnHover = {};
      };

      $scope.toggleNegative = function () {
        PrintObject.data.details.clipping = PrintObject.data.details.clipping === 'ffffff' ? '000000' : 'ffffff';
      };

      $scope.toggleRemoveWhite = function () {
        PrintObject.data.details.clipping = PrintObject.data.details.clipping === 'ffffff' ? '' : 'ffffff';
      };

      $scope.toggleSolidColor = function () {
        PrintObject.data.threshold.size = PrintObject.data.threshold.size > 0 ? 0 : 100;
      };

      $scope.hasThreshold = function () {
       return PrintObject.data.threshold.size > 0;
      }

      $scope.hasClipping = function (color) {
        return PrintObject.data.details.clippings.indexOf(color.hex) >= 0;
      };

      $scope.togglePaletteColor = function (color, $event) {
        var clippings = PrintObject.data.details.clippings.filter(function (hex) {
          return $scope.palette.filter(function (color) {
            return color.hex.toLowerCase() === hex.toLowerCase();
          }).length;
        });

        var index = PrintObject.data.details.clippings.indexOf(color.hex);
        var inkCount = 0;

        if (index === -1 && clippings.length === $scope.palette.length - 1) {
          $scope.uploadMenu.showPaletteWarning = true;

          return false;
        } else if ($scope.uploadMenu.showPaletteWarning) {
          $scope.uploadMenu.showPaletteWarning = false;
        }

        if (index >= 0) {
          PrintObject.data.details.clippings.splice(index, 1);
        } else {
          PrintObject.data.details.clippings.push(color.hex);
        }

        inkCount = $scope.palette.length - PrintObject.data.details.clippings.length;
        PrintObject.data.details.inkColors = InkColors.process.slice(0, inkCount);

         $scope.uploadMenu.option = getUploadOption();
         $scope.setMultiColor();
      };

      $scope.swapPaletteColor = function (color, $event) {
        if ($scope.hasClipping(color)) {
          return false;
        }

        var existing = PrintObject.data.details.swappings.filter(function (swap) {
          return color.hex === swap.target;
        }).shift();

        if (existing) {
          $scope.activeSwap = existing;
        } else {
          $scope.activeSwap = {
            target: color.hex.toLowerCase()
          };
        }

        $scope.setAdvance('swapColor');
      };

      $scope.hasReplacementColor = function (color) {
        return $scope.getReplacementColor(color) !== 'transparent';
      };

      $scope.getReplacementColor = function (color) {
        var existing = PrintObject.data.details.swappings.filter(function (swap) {
          return color.hex === swap.target;
        }).shift();

        return existing ? '#' + existing.replacement : 'transparent'
      };

      $scope.removeReplacement = function () {
        var existing = PrintObject.data.details.swappings.filter(function (swap) {
          return $scope.activeSwap.target === swap.target;
        }).shift();

        var index = PrintObject.data.details.swappings.indexOf(existing);

        PrintObject.data.details.swappings.splice(index, 1);
        $scope.activeSwap.replacement = '';
      };

      $scope.changeReplacementColor = function (color, $event) {
        var existing = PrintObject.data.details.swappings.filter(function (swap) {
          return $scope.activeSwap.target === swap.target;
        }).shift();

        $scope.activeSwap.target = $scope.activeSwap.target.toLowerCase();
        $scope.activeSwap.replacement = color.hex.toLowerCase();

        if (!existing) {
          PrintObject.data.details.swappings.push($scope.activeSwap);
        }
      };

      $scope.$on('printObjectSet', function (event, printObject) {
        $scope.uploadMenu.uploadSize = Math.abs(printObject.scaleX);

        if (!printObject.type) {
          $scope.setActive(false);

          return true;
        }

        if (printObject.type !== 'uploadobject') {
          return true;
        }

        $scope.palette.length = 0;
        $scope.uploadMenu.option = getUploadOption();

        if (needsPalette()) {
          loadPalette();
        }
      });

      $scope.$on('advanceMenuSet', function (event, value) {
        if (value === 'multiColor') {
          PrintObject.addWarned(PrintObject.data);
        }
      });

      $scope.$watch('uploadMenu.uploadSize', function (newValue, oldValue) {
        if (newValue !== oldValue) {
          PrintObject.setSize(newValue);
        }
      });

      $scope.$on('printMethodSet', function () {
        $scope.isEmbroidery = Design.getPrintMethodCode() === 'emb';
        $scope.uploadMenu.option = getUploadOption();
      });

      $scope.$on('$destroy', onPrintObjectResized);

      function getUploadOption() {
        if (PrintObject.data.details.multiColor == 0) {
          return '1';
        } else if (PrintObject.data.details.multiColor == 1 && PrintObject.data.details.inkColors.length > 1) {
          return PrintObject.data.details.inkColors.length.toString();
        } else if (PrintObject.data.details.multiColor == 1 && PrintObject.data.details.inkColors.length === 1) {
          return '9';
        } else if (PrintObject.data.details.multiColor == 3) {
          return '7';
        } else {
          return '8';
        }
      }

      function needsPalette() {
        var option = getUploadOption();

        return option > 1 && option != 7 && $scope.uploadMenu.hasPaletteSupport;
      }

      function showPalette() {
        return needsPalette();
      }

      function loadPalette() {
        $scope.palette.length = 0;
        $scope.uploadMenu.gettingPalette = true;

        UploadPalette.getPaletteFromUpload(PrintObject.data).then(function (palette) {
          $scope.palette = palette;
          $scope.uploadMenu.gettingPalette = false;
          UploadPalette.mergeSwappings(PrintObject.data.details.swappings, palette);
        });
      }
  }]
);

'use strict';

angular.module('designstudioApp')
  .controller('EditProductCtrl', ['$scope', '$rootScope', 'Design', 'DesignItem', 'Catalog', 'Pricing', 'QuantitiesModal', '$analytics', '$uibModal', 'dialogs',
  function ($scope, $rootScope, Design, DesignItem, Catalog, Pricing, QuantitiesModal, $analytics, $uibModal, dialogs) {
    var existingColorData = false;

    $scope.productMenu = {
      items: [],
      categories: [],
      mainCategory: {},
      subCategory: {},
      activeColor: false,
      requestActive: false,
      quote: false
    };

    $scope.Design = Design;
    $scope.DesignItem = DesignItem;
    $scope.getProductItemUrl = DesignItem.getProductItemUrl;
    $scope.hasSizeChart = DesignItem.hasSizeChart;
    $scope.openSizeChart = DesignItem.openSizeChart;

    $scope.openQuantitiesModal = QuantitiesModal.open;

    $scope.$watch('Design.data', function (newValue) {
      if (Design.hasMinQuantity() === false) {
        return;
      }

      Pricing.getFullQuote(Design.data).then(function (response) {
        $scope.productMenu.quote = response;
      });
    }, true);

    $scope.isExistingItem = function (itemId) {
      return Design.data.designItems.some(function (designItem) {
        return parseInt(designItem.catalogItemId, 10) == parseInt(itemId, 10);
      });
    };

    $scope.getPricePer = function (itemId, colorId) {
      return Pricing.getItemColorPrice($scope.productMenu.quote, itemId, colorId);
    };

    $scope.editItem = function (item) {
      DesignItem.switchItemColor(item);
      $scope.setActive('catalog');
    };

    $scope.addNewItem = function () {
      $uibModal.open({
        templateUrl: 'views/modal/add-product.html?ts='+Date.now(),
        controller: 'AddProductModalCtrl',
        controllerAs: 'modal',
        keyboard: true,
        backdrop: true,
        size: 'lg',
        windowClass: 'add-product-modal',
        resolve: {
          onSuccess: function () {
            return angular.noop;
          }
        }
      });
    };

    $scope.canAddNewItem = function () {
      return Design.isEmbroidery() === false;
    };

    $scope.changeMainCategory = function (category) {
      $scope.productMenu.items = [];
      $scope.productMenu.subCategory = {};
      category.children = Catalog.flattenCategories(category.children);
      $scope.productMenu.mainCategory = category;

      if (category.children.length === 0) {
        $scope.setAdvance('items');
        $scope.changeSubCategory(category);
      } else {
        $scope.setAdvance('subcategory');
      }
    };

    $scope.changeSubCategory = function (category) {
      $scope.productMenu.items = [];
      $scope.productMenu.subCategory = category;
      $scope.productMenu.requestActive = true;

      Catalog.getItemsByCategoryId(category.id).then(function(data) {
        $scope.productMenu.items = data;
        $scope.productMenu.requestActive = false;
      });
    };

    $scope.hasColorForChange = function (color) {
      if (DesignItem.color.id == color.id) {
        return false;
      } else {
        return DesignItem.hasColor(color);
      }
    };

    $scope.hasColorForAdd = function (color) {
      if ($scope.productMenu.activeColor.id === color.id) {
        return false;
      } else if(color.code === existingColorData.code) {
        return true;
      } else {
        return DesignItem.hasColor(color);
      }
    };

    $scope.setActiveColor = function (color) {
      if (angular.isObject(existingColorData) === false) {
        existingColorData = {};
      }

      existingColorData.code = existingColorData.code ? existingColorData.code : DesignItem.color.code;
      existingColorData.hex = existingColorData.hex ? existingColorData.hex : DesignItem.color.hex;
      existingColorData.maskHex = existingColorData.maskHex ? existingColorData.maskHex : DesignItem.color.maskHex;

      DesignItem.color.code = color.code;
      DesignItem.color.hex = color.hex;
      DesignItem.color.maskHex = color.maskHex;
      $scope.productMenu.activeColor = color;

      $rootScope.$broadcast('catalogColorSet', DesignItem.color);
    };

    $scope.switchItemColor = function (designItem, color, $event) {
      $event.preventDefault();
      DesignItem.switchItemColor(designItem, color);
      Design.checkActivePrintArea();
      Design.setPrintAreaFocusArea(designItem.printAreas);
    };

    $scope.addNewColor = function (designItem) {
      DesignItem.switchItemColor(designItem);
      $scope.setAdvance('addColor');
    };

    $scope.addColor = function () {
      var color;

      DesignItem.color.code = existingColorData.code;
      DesignItem.color.hex = existingColorData.hex;
      DesignItem.color.maskHex = existingColorData.maskHex;
      existingColorData = false;

      color = DesignItem.addColor($scope.productMenu.activeColor);
      DesignItem.switchColor(color);

      $scope.productMenu.activeColor = false;
      $scope.setAdvance('false');
    };

    $scope.cancelAddColor = function () {
      restoreExistingColor();
      $scope.setAdvance('false');
    };

    $scope.changeColor = function (designItem, color) {
      DesignItem.switchItemColor(designItem, color);
      $scope.setAdvance('changeColor');
    };

    $scope.editSizes = function (color) {
      DesignItem.switchColor(color);
      $scope.openQuantitiesModal();
      $scope.setActive(false);

      $analytics.eventTrack('product change - unit number/size change', {category: 'design studio'});
    };

    $scope.setColor = function (color) {
      DesignItem.setColor(color);

      $analytics.eventTrack('product change - color', {category: 'design studio', label: color.name});
    };

    $scope.colorOnEnter = function (color) {
      $scope.colorOnHover = color;
    };

    $scope.colorOnLeave = function () {
      $scope.colorOnHover = {};
    };

    function restoreExistingColor() {
      if (!existingColorData) {
        return false;
      }

      DesignItem.color.code = existingColorData.code;
      DesignItem.color.hex = existingColorData.hex;
      DesignItem.color.maskHex = existingColorData.maskHex;
      existingColorData = false;

      $scope.productMenu.activeColor = false;
      $rootScope.$broadcast('catalogColorSet', DesignItem.color);
    }

    $scope.$on('$destroy', restoreExistingColor);
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('buttonSwitch', [function () {
    return {
      templateUrl: 'views/common/buttonSwitch.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: false,
      link: function postLink(scope, element, attrs) {
        element.text('this is the buttonSwitch directive');
      }
    };
  }]);

'use strict';

angular.module('designstudioApp')
  .directive('menuAddArt', [function () {
    return {
      templateUrl: 'views/menu/addArt.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: false,
      link: function postLink(scope, element, attrs) {
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .controller('AddArtCtrl', ['$scope', '$window', '$timeout', 'Design', 'Clipart', 'PrintArea', 'PrintObject', 'FileUploader', 'InkColors', 'config', '$analytics', 'MainMenu', 'Viewport', 'UploadModal', 'UploadPalette',
  function ($scope, $window, $timeout, Design, Clipart, PrintArea, PrintObject, FileUploader, InkColors, config, $analytics, MainMenu, Viewport, UploadModal, UploadPalette) {
    var uploadMinTime = 5000;
    var clipartResults = [];

    $scope.addArtMenu = {
      uploadFile: null,
      uploadErrors: {},
      searchTerm: '',
      clipart: [],
      newMode: Clipart.newMode,
      swapMode: Clipart.swapMode,
      activeClipartObject: false,
      clipartCategoriesAlpha: [],
      clipartCategoriesBeta: [],
      mainClipartCategory: {},
      subClipartCategory: {},
      shortcuts: Clipart.shortcuts
    };

    $scope.hasFileSupport = !!($window.File && $window.FormData && $window.FileReader);
    $scope.addClipart = addClipart;

    // this is a quick workaround to get uploading working in ie9, the upload process needs to be re-factored.
    $scope.uploadArtForm = function (formId) {
      var uploadStartTime;

      if(angular.element('#' + formId).find('input').val() == '') {
        $scope.addArtMenu.uploadErrors.required = true;

          return false;
      }

      uploadStartTime = new Date().getTime();
      $scope.setAdvance('isUploading');

      FileUploader.uploadFallBack(formId, config.uploadGatewayURL).then(function (fileObject) {
         var uploadTime =  new Date().getTime() - uploadStartTime;

        if (uploadTime < uploadMinTime) {
          $timeout(function () {
            addNewArt(fileObject);
          }, uploadMinTime - uploadTime);
        } else {
          addNewArt(fileObject);
        }
      }, function (response) {
        $scope.setAdvance('uploadError');
      });
    };

    $scope.uploadArt = function (file) {
      var uploadStartTime;

      $scope.addArtMenu.uploadErrors = {};

      if ( ! file) {
        $scope.addArtMenu.uploadErrors.required = true;

        return false;
      }

      if (file.size > 30000000) {
        $scope.addArtMenu.uploadErrors.maxSize = true;

        return false;
      }

      uploadStartTime = new Date().getTime();
      $scope.setAdvance('isUploading');

      FileUploader.upload(file, config.uploadGatewayURL).then(function (fileObject) {
        var uploadTime =  new Date().getTime() - uploadStartTime;

        if (uploadTime < uploadMinTime) {
          $timeout(function () {
            addNewArt(fileObject);
          }, uploadMinTime - uploadTime);
        } else {
          addNewArt(fileObject);
        }

      }, function (response) {
        $scope.setAdvance('uploadError');
      });
    };

    $scope.setActiveClipart = function (clipart) {
      if (angular.isUndefined(clipart.id)) {
        return false;
      }

      if ($scope.addArtMenu.activeClipartObject) {
        $scope.addArtMenu.activeClipartObject.details.src = clipart.name;
        $scope.addArtMenu.activeClipartObject.details.clipartId = clipart.id;
      } else {
        $scope.addClipart(clipart);
      }
    };

    $scope.selectClipart = function (clipart) {
      if ($scope.addArtMenu.swapMode) {
        $scope.addArtMenu.activeClipartObject = PrintObject.data;
        $scope.setActiveClipart(clipart);
        $scope.selectActiveClipart();
      } else {
        $scope.addClipart(clipart);
        $scope.selectActiveClipart();
      }
    };

    $scope.selectActiveClipart = function () {
      if (Viewport.isExtraSmall()) {
        PrintObject.set($scope.addArtMenu.activeClipartObject, true);
        MainMenu.setActive(false);
      } else {
        PrintObject.set($scope.addArtMenu.activeClipartObject);
        $scope.addArtMenu.activeClipartObject = false;
        Clipart.swapMode = false;
        Clipart.newMode = false;
      }
    };

    $scope.changeMainClipartCategory = function (category) {
      $scope.addArtMenu.mainClipartCategory = category;
      $scope.addArtMenu.subClipartCategory = {};
    };

    $scope.changeSubClipartCategory = function (category) {
      clipartResults = [];
      $scope.addArtMenu.clipart = [];
      $scope.addArtMenu.searchTerm = '';
      $scope.addArtMenu.requestActive = true;
      $scope.addArtMenu.searchTerm = category.name;
      $scope.addArtMenu.subClipartCategory = category;

      Clipart.mainCategory = $scope.addArtMenu.mainClipartCategory;
      Clipart.subCategory = $scope.addArtMenu.subClipartCategory;

      Clipart.search(category.name).then(function (data) {
        clipartResults = data;
        $scope.addArtMenu.clipart = _.first(data, 1);
        $scope.addArtMenu.requestActive = false;
      });
    };

    $scope.searchClipart = function (term) {
      clipartResults = [];
      $scope.addArtMenu.clipart = [];
      $scope.addArtMenu.requestActive = true;
      $scope.addArtMenu.mainClipartCategory = {};
      $scope.addArtMenu.subClipartCategory = {};
      $scope.addArtMenu.searchTerm = Clipart.searchTerm = term;

      Clipart.search(term).then(function (data) {
        clipartResults = data;
        $scope.addArtMenu.clipart = _.first(data, 1);
        $scope.addArtMenu.requestActive = false;
      });
    };

    $scope.loadMoreClipart = function (menuHeight) {
      var numberToLoad = Math.round(parseInt(menuHeight, 10) / 45);
      var newClipart = clipartResults.splice(0, numberToLoad);

      $scope.addArtMenu.clipart = _.union($scope.addArtMenu.clipart, newClipart);
    };

    $scope.getIcon = function (name) {
      return 'designstudio-clipart-' + name.toLowerCase();
    };

    $scope.getClipartPreviewUrl = function (name) {
      return config.clipartPreviewURL + '/' + name + '.x100.png';
    };

    if ($scope.addArtMenu.swapMode || $scope.addArtMenu.newMode) {
      if (Clipart.searchTerm) {
        $scope.addArtMenu.searchTerm = Clipart.searchTerm;
        $scope.searchClipart(Clipart.searchTerm);
        $scope.setAdvance('clipartSearch');
      } else if (Clipart.mainCategory) {
        $scope.addArtMenu.mainClipartCategory = Clipart.mainCategory;

        if (Clipart.subCategory) {
          $scope.changeSubClipartCategory(Clipart.subCategory);
          $scope.setAdvance('clipartSubCategory');
        } else {
          $scope.setAdvance('clipartCategory');
        }
      }
    }

    Clipart.getCategories().then(function(data) {
      $scope.addArtMenu.clipartCategoriesAlpha = data.splice(0, data.length / 2);
      $scope.addArtMenu.clipartCategoriesBeta = data;
    });

    function addClipart(clipart) {
      var printObject;
      var template = PrintArea.getPrintObjectTemplate();

      template.clipartId = clipart.id;
      template.clipartSrc = clipart.name;

      printObject = PrintObject.createClipartObject(template);

      PrintArea.addPrintObject(printObject);
      $scope.addArtMenu.activeClipartObject = printObject;

      $analytics.eventTrack('add art - library image', {category: 'design studio', label: clipart.name});
    }

    function addNewArt(fileObject) {
      var printObject;
      var template = PrintArea.getPrintObjectTemplate({type: 'upload'});

      template.file = fileObject;
      printObject = PrintObject.createUploadObject(template);

      if (Design.isEmbroidery()) {
        printObject.details.multiColor = 2;
        printObject.details.inkColors = angular.copy(InkColors.process);
      }

      if (UploadPalette.hasPaletteSupport()) {
        UploadModal.open(printObject).opened.then(function () {
          MainMenu.setActive(false);
        });
      } else {
        PrintArea.addPrintObject(printObject);

        if (Viewport.isExtraSmall()) {
          PrintObject.set(printObject, true);
          MainMenu.setActive(false);
        } else {
          PrintObject.set(printObject);
        }
      }

      $analytics.eventTrack('add art - uploaded image', {category: 'design studio'});
    }
  }
]);

'use strict';

angular.module('designstudioApp')
  .service('Clipart', ['$q', 'JSONService', 'APIService', 'config', 'algolia', function Clipart($q, JSONService, APIService, config, algolia) {
    var me = this;

    me.swapMode = false;
    me.newMode = false;
    me.searchTerm = '';
    me.mainCategory = false;
    me.subCategory = false;
    me.shortcuts = [];

    me.search = function (term) {
      var client = algolia.Client(config.algolia.id, config.algolia.key);
      var index = client.initIndex('dev_clipart');

      term = term.toLowerCase() || '';

      return index.search(term, {
        facetFilters: ['active:1'],
        facets: ['*'],
        hitsPerPage: 1000,
        getRankingInfo: 0,
        maxValuesPerFacet: 1000
      }).then(onResponse);

      function onResponse(response) {
        response.hits.sort(function (a, b) {
          var ap = a.keywords.filter(getKeyword).sort(keywordByPriority).shift();
          var bp = b.keywords.filter(getKeyword).sort(keywordByPriority).shift();

          ap = angular.isDefined(ap) ? ap.priority : 0;
          bp = angular.isDefined(bp) ? bp.priority : 0;

          return bp - ap;
        });

        return response.hits;

        function getKeyword(keyword) {
          return keyword.term.toLowerCase() === term;
        }

        function keywordByPriority(a, b) {
           return b.priority - a.priority;
        }
      }
    };

    me.getCategories = function () {
      var deferred = $q.defer();

      APIService.getClipartCategories().success(function(response) {
        deferred.resolve(response);
      });

      return deferred.promise;
    };

    me.addShortcut = function (shortcut) {
      me.shortcuts.push(shortcut);
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('clipartPreview', ['ClipartObject', 'config', function (ClipartObject, config) {
    return {
      template: '<div class="clipart-preview">Loading...</div>',
      restrict: 'E',
      replace: true,
      scope: {
        filename: '='
      },
      link: function postLink(scope, element, attrs) {
        var onLoad = function (Fragment) {
          var paper = Snap();
          var svg = Fragment.select('svg');
          var groups = svg.selectAll('g');
          var layerOne = groups[groups.length - 1]; // Assume the last group is the outline layer.

          if (angular.isUndefined(layerOne)) {
            layerOne = paper.g();

            svg.selectAll('*').forEach(function (child) {
              layerOne.add(child);
            });
          }

          paper.append(layerOne);
          element.empty();
          Snap(element[0]).append(paper); //required for getBBox
          render(paper);
        };

        var render = function (svg) {
          var layerOne = svg.selectAll('g')[0];

          svg.attr({
            preserveAspectRatio: 'xMinYMin none',
            version: '1.1',
            baseProfile: 'full',
            width: '100%',
            height: '100%',
            viewBox: layerOne.getBBox().vb
          });
        };

        Snap.load(config.clipartURL + '/' + scope.filename + '.svg', onLoad);
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .service('FileUploader', ['$http', '$q', '$window', function FileUploader($http, $q, $window) {
    var me = this;

    me.upload = function (file, uploadURL) {
      var deferred = $q.defer();
      var formData = new FormData();
      var postConfig = {headers: {'Content-Type': undefined}, transformRequest: function (data) {return data;}}

      formData.append('uploaded', file);

      $http.post(uploadURL, formData, postConfig)
      .success(function(response) {
        var parser = new $window.DOMParser();
        var xmlDoc = parser.parseFromString(response, 'text/xml');
        var element = angular.element(xmlDoc);

        if (element.find('success').text() == 'true') {
          deferred.resolve({
            origFileName: element.find('origFileName').text(),
            fileName: element.find('fileName').text(),
            fileId: element.find('fileId').text()
          });
        } else {
          deferred.reject(response);
        }
      });

      return deferred.promise;
    };

    me.uploadFallBack = function (formId, uploadUrl) {
      var deferred = $q.defer();
      var $form = $('#' + formId);

      $form.attr('action', uploadUrl);

      $form.ajaxSubmit({
        type: 'POST',
        dataType: 'xml',
        iframe: true,
        traditional: true,
        forceSync: true,
        success: function (responseXML, status, xhr, form) {
          var element = angular.element(responseXML);

          if (element.find('success').text() == 'true') {
            deferred.resolve({
              origFileName: element.find('origFileName').text(),
              fileName: element.find('fileName').text(),
              fileId: element.find('fileId').text()
            });
          } else {
            deferred.reject(response);
          }
        },
        error: function (event, status, response, form) {
          deferred.reject(response);
        }
      });

      return deferred.promise;
    };
  }
]);

'use strict';

angular.module('designstudioApp')
  .directive('uploadInput', [function () {
    return {
      templateUrl: 'views/common/uploadInput.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: {
        file: '='
      },
      link: function postLink(scope, element, attrs) {
        var textInput = element.find('input[type="text"]');
        var fileInput = element.find('input[type="file"]');

        fileInput.change(function (event) {
          scope.file = event.target.files[0];
          textInput.val(event.target.value);
          scope.$apply();
        });

        element.find('button').click(function () {
          fileInput.click();
        });

        textInput.click(function () {
          fileInput.click();
        });
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .service('Catalog', ['JSONService', 'APIService', 'DesignItem' ,'Branding', 'config', 'algolia', 'StudioMode', function Catalog(JSONService, APIService, DesignItem, Branding, config, algolia, StudioMode) {
    var me = this;
    
    me.flattenCategories = function (categories) {
      var subcategories = [];

      if (angular.isUndefined(categories)) {
        return [];
      }

      for (var i = categories.length - 1; i >= 0; i--) {

        if (categories[i].children.length > 0) {
          for (var j = categories[i].children.length - 1; j >= 0; j--) {
             subcategories.unshift(categories[i].children[j]);
          };
        } else {
          subcategories.unshift(categories[i]);
        }
      }

      return subcategories;
    };

    me.getItemsByCategoryId = function (id) {
      return JSONService.getItemsByCategoryId(id, Branding.id).then(function (response) {
        return response.data;
      });
    };

    me.getItemById = function (id) {
      return APIService.getItemById(id).then(function (response) {
        return response.data;
      });
    };

    me.shouldAskToDeleteColors = function (designItem, catalogItem) {
      var matches;
      var quantity = DesignItem.getQuantityOfItem(designItem);

      if (quantity === 0 && designItem.colors.length === 1) {
        return false;
      }

      if (quantity > 0 && DesignItem.hasAllMatchingSizes(designItem, catalogItem)) {
        return false;
      }

      if (quantity > 0 && designItem.colors.length === 1) {
        matches = [{
          existing: designItem.colors[0],
          available: catalogItem.availableColors[0]
        }];

        if (DesignItem.hasMatchingSizes(matches)) {
          return false;
        }
      }

      return true;
    };

    me.getMissingColors = function (designItem, catalogItem) {
      return designItem.colors.filter(function (color) {
        return !catalogItem.availableColors.find(function (availableColor) {
          return DesignItem.doesColorMatch(availableColor, color);
        });
      });
    };

    me.getIncompatibleMethodsMsg = function(items, newItem) {
      var msg = '';

      msg = 'By switching your product to the ';
      msg += newItem.style;
      msg += ', the product(s) ';
      msg += items.map(function (item) {
        return item.style;
      }).join(', ');
      msg += ' will be deleted due to incompatibly.';

      return msg;
    };

    me.getIncompatibleColorsMsg = function(missingColors, newItem, oldItem) {
      var msg = '';

      var mColors = parseColors(missingColors);
      var eColors = parseColors(oldItem.colors.filter(function (color) {
        return newItem.availableColors.some(function (newColor) {
          return newColor.name.toLowerCase() === color.name.toLowerCase();
        });
      }));

      msg = 'By switching your product to the ';
      msg += newItem.style;
      msg += ', all of the sizing data for ';
      msg += oldItem.style;
      msg += ' in ';
      msg += mColors;
      msg += ' will be deleted.';

      if (eColors) {
        msg += ' ';
        msg += eColors;
        msg += ' will be retained.'
      }

      return msg;

      function parseColors(colors) {
        return colors.map(function (color) {
          return color.name.charAt(0) + color.name.slice(1).toLowerCase();
        }).join(', ');
      }
    };

    me.search = function (term, facetFilters, filters) {
      var client = algolia.Client(config.algolia.id, config.algolia.key);
      var index = client.initIndex('prod_products');

      term = term || '';
      facetFilters = facetFilters.slice() || [];
      facetFilters.push('brandings:' + Branding.name.toLowerCase());
      facetFilters.push('catalogActive: 1');

      return index.search(term, {
        filters: filters,
        facetFilters: facetFilters,
        facets: ['*'],
        hitsPerPage: 1000,
        getRankingInfo: 0,
        maxValuesPerFacet: 1000
      }).then(onResponse);

      function onResponse(response) {
        transformHits(response.hits);
        transformFacets(response.facets);
        sortFacets(response.facets);

        return response;
      }

      function transformHits(hits) {
        hits.forEach(function (hit) {
          var key = Math.floor(hit.colors.length / 2);

          hit.code = hit.colors[key].code;
        });
      }

      function transformFacets(facets) {
        Object.keys(facets).forEach(function (name) {
          facets[name] = Object.keys(facets[name]).map(function (value) {
            return {name: value, count: facets[name][value]};
          });
        });
      }

      function sortFacets(facets) {
        Object.keys(facets).forEach(function (key) {
          facets[key].sort(function (a, b) {
            var ai = facetFilters.indexOf(key + ':' + a.name);
            var bi = facetFilters.indexOf(key + ':' + b.name);
            var af = ai > -1;
            var bf = bi > -1;

            if (af && bf) {
              return ai > bi ? 1 : 0;
            } else if (af) {
              return -1;
            } else if(bf) {
              return 1;
            } else {
              return b.count - a.count;
            }
          });
        });
      }
    };

    me.searchCategories = function(facetFilters){
      var client = algolia.Client(config.algolia.id, config.algolia.key);
      var categoryIndex = 'prod_catalogcategories';
      var index = client.initIndex(categoryIndex);

      facetFilters = (facetFilters) ? facetFilters.slice() : [];
      facetFilters.push('active: 1');

      return index.search({
        facetFilters: facetFilters,
        facets: ['*'],
        hitsPerPage: 1000,
        getRankingInfo: 0,
        maxValuesPerFacet: 1000
      }).then(onCategorySearch);

      function onCategorySearch(response){
        return response;
      }

    }

    me.getItemCompatibles = APIService.getItemCompatibles;
  }
]);

'use strict';

angular.module('designstudioApp')
  .filter('catalogSizeTypes', [function () {
    return function (sizeTypes) {
      var output = [];
      var whiteList = ['Adult', 'Youth'];

      if (angular.isUndefined(sizeTypes)) {
        return '';
      }

      for (var i = sizeTypes.length - 1; i >= 0; i--) {
        if (output.length === whiteList.length) {
          break;
        }

        if (whiteList.indexOf(sizeTypes[i]) > -1 && output.indexOf(sizeTypes[i]) === -1) {
          output.push(sizeTypes[i]);
        }
      }

      return output.sort().join(' & ');
    };
  }
]);

'use strict';

angular.module('designstudioApp')
  .directive('menuNameAndNumbers', [function () {
    return {
      templateUrl: 'views/menu/nameAndNumbers.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: false
    };
  }]
);

(function(angular) {
  'use strict';

  var component = {
    bindings: {
      color: '<',
      isActive: '<',
      isIndicated: '<'
    },
    transclude: false,
    controller: controller,
    templateUrl: 'views/common/colorPickerOption.html'
  };

  function controller(InkColors) {
    var vm = this;

    vm.isFlo = InkColors.isFlo;
    vm.isMetallic = InkColors.isMetallic;

    vm.getTitle = getTitle;
    vm.$onInit = onInit;

    function getTitle() {
      return InkColors.isSpecial(vm.color) ? '' : vm.color.name;
    }

    function onInit() {
      vm.popoverAction = InkColors.isSpecial(vm.color) ? 'mouseenter' : 'none';
    }
  }

  controller['$inject'] = ['InkColors'];

  angular.module('designstudioApp').component('colorPickerOption', component);
})(angular);

'use strict';

angular.module('designstudioApp')
  .service('Pricing', ['$q', '$http', 'PrintArea', 'JSONService', 'APIService', 'localStorageService',
  function Pricing($q, $http, PrintArea, JSONService, APIService, localStorageService) {
    var me = this;
    var existingQuote;

    me.createQuoteRequest = function (design) {
      var quote = {
        items: angular.copy(design.designItems, []),
        printAreas: [],
        vinyl: {names: 0, numbers: 0}
      };

      for (var i = design.printAreas.length - 1; i >= 0; i--) {
        quote.printAreas.push({
          printMethod: design.printAreas[i].printMethod.code,
          colors: _.range(PrintArea.countInkColors(design.printAreas[i]))
        });
      }

      for (var i = design.printAreas.length - 1; i >= 0; i--) {
        if (angular.isDefined(design.printAreas[i].vinyl)) {
          if (design.printAreas[i].vinyl.names == 1) {
            quote.vinyl.names = 1;
          }

          if (design.printAreas[i].vinyl.numbers == 1) {
            quote.vinyl.numbers = 1;
          }
        }

        if (quote.vinyl.names === 1 || quote.vinyl.numbers === 1) {
          break;
        }
      }

      return quote;
    };

    me.getSavedQuote = function (design) {
      var request = me.createQuoteRequest(design);
      var savedRequest = localStorageService.get('quote.request.' + design.id);

      if (angular.equals(request, savedRequest)) {
         return localStorageService.get('quote.response.' + design.id);
      } else {
        return false;
      }
    };

    me.getFullQuote = function (design) {
      var quote = me.getSavedQuote(design);

      if (quote === false) {
        return me.getQuote(design);
      } else {
        return $q.when(quote);
      }
    };

    me.getPricePerPiece = function (design, itemId, colorId) {
      return me.getFullQuote(design).then(function (quote) {
        return me.getItemColorPrice(quote, itemId, colorId);
      });
    };

    me.getItemColorPrice = function (quote, itemId, colorId) {
      if (!quote) {
        return 0;
      }

      for (var i = 0; i < quote.items.length; i++) {
        if (quote.items[i].id == itemId) {
          for (var j = 0; j < quote.items[i].colors.length; j++) {
            if (quote.items[i].colors[j].id == colorId) {
              return quote.items[i].colors[j].perPiece;
            }
          }
        }
      }
    };

    me.getQuote = function (design) {
      var request = me.createQuoteRequest(design);
      request = [request];
      return APIService.getQuote(request).then(function(quote){
        quote.discount = quote.webDiscount;
        quote.total = quote.colorTotal.replace(/,/gi, '');
        quote.originalPerPiece = parseFloat(quote.perPiece)/(1-(parseInt(quote.discount, 10)/100));
        quote.originaltotalprice = parseFloat(quote.total)/(1-(parseInt(quote.discount, 10)/100));
        quote.discountAmount = quote.originaltotalprice - quote.total;

        return quote;
      });

     //  // **** Testing **** //
     // var json = JSONService.getQuote(request.items, request.printAreas, request.vinyl).then(function (response) {
     //    var serviceQuote = response.data;

     //    serviceQuote.discount = serviceQuote.webDiscount;

     //    serviceQuote.total = serviceQuote.colorTotal.replace(/,/gi, '');
     //    serviceQuote.perPiece = serviceQuote.perPiece.replace(/,/gi, '');

     //    for (var i = serviceQuote.items.length - 1; i >= 0; i--) {
     //      for (var j = serviceQuote.items[i].colors.length - 1; j >= 0; j--) {
     //        serviceQuote.items[i].colors[j].perPiece = serviceQuote.items[i].colors[j].perPiece.replace(/,/gi, '');
     //      }
     //    }
     //    serviceQuote.originalPerPiece = parseFloat(serviceQuote.perPiece)/(1-(parseInt(serviceQuote.discount, 10)/100));
     //    serviceQuote.originaltotalprice = serviceQuote.originalPerPiece  * serviceQuote.quantity;
     //    serviceQuote.discountAmount = serviceQuote.originaltotalprice - serviceQuote.total;

     //    return serviceQuote;
     //  });


     //  function compare(a, b) {
     //    Object.keys(a).forEach(function (key) {
     //      if (angular.isArray(a[key]) || angular.isObject(a[key])) {
     //        return false;
     //      }

     //      console.assert(a[key] == b[key], key + ' = ' + a[key] + ' - ' + b[key]);
     //    });

     //  }

     // return $q.all([api, json]).then(function (responses) {
     //    var api = responses[0];
     //    var json = responses[1];

     //    compare(api, json);

     //    return api;
     //  });
    };
  }
]);

'use strict';

angular.module('designstudioApp')
  .directive('distress', ['$timeout', 'DesignItem', 'PrintArea', function ($timeout, DesignItem, PrintArea) {
    return {
      template: '<div class="distress"></div>',
      restrict: 'E',
      replace: true,
      scope: false,
      link: function postLink(scope, element, attrs) {
        var svgOrgWidth, svgOrgHeight;

        Snap.load('resources/distress/distress-two.svg', function (Fragment) {
          var svg = Fragment.select('svg');

          svgOrgWidth = svg.node.getAttribute('width').replace('px', '');
          svgOrgHeight = svg.node.getAttribute('height').replace('px', '');

          Snap(element[0]).append(svg);
          renderMask(svg);

          scope.$watch('workspace', function (newValue, oldValue) {
            scale(Snap(element[0]).select('svg'));
          }, true);

          scope.$on('catalogItemSet', function () {
            if (scope.PrintArea.data.distressed == 1) {
              renderMask(Snap(element[0]).select('svg'));
            }
          });

          scope.$on('catalogColorSet', function () {
            if (scope.PrintArea.data.distressed == 1) {
              renderMask(Snap(element[0]).select('svg'));
            }
          });

          scope.$on('printAreaSet', function (event, printArea) {
            if (scope.PrintArea.data.distressed == 1) {
              renderMask(Snap(element[0]).select('svg'));
            }
          });
        });

        function renderMask(svg) {
          var colorHex, background, maskTextureURL;
          var svgScale = svgOrgWidth / scope.canvas.width;
          var attrs = {
            x: (-scope.canvas.left + scope.getProductCanvasDims().left) * svgScale,
            y: (-scope.canvas.top + scope.getProductCanvasDims().top) * svgScale,
            width: scope.workspace.scale * scope.display.product.width * svgScale,
            height: scope.workspace.scale * scope.display.product.height * svgScale
          };

          var mask = svg.select('#distress-image-mask').select('image');
          var maskURL = DesignItem.getProductMaskUrl(DesignItem.item.style, PrintArea.data.code);
          var maskTexture = svg.select('#distress-masktexture');

          colorHex = DesignItem.color.maskHex ? DesignItem.color.maskHex : DesignItem.color.hex;
          background = svg.select('#distress-background');

          background.attr({
            fill: '#' + colorHex
          });

          if (DesignItem.color.maskTexture) {
            maskTextureURL = DesignItem.getProductMaskTextureURL(DesignItem.color.maskTexture);
            maskTexture.node.setAttributeNS("http://www.w3.org/1999/xlink", 'href', maskTextureURL);
          } else {
            maskTexture.node.setAttributeNS("http://www.w3.org/1999/xlink", 'href', '');
          }

          mask.attr(attrs);
          mask.node.setAttributeNS("http://www.w3.org/1999/xlink", 'href', maskURL);
          scale(svg);
        }

        function scale(svg) {
          var newWidth, newHeight;
          var printAreaRatio = scope.canvas.width / scope.canvas.height;

          newWidth = svgOrgWidth;
          newHeight = svgOrgWidth * (1 / printAreaRatio);

          svg.attr({
            viewBox: '0 0 ' + newWidth + ' ' + newHeight
          });

          svg.node.setAttribute('width', Math.floor(scope.canvas.width) + 'px');
          svg.node.setAttribute('height', Math.floor(scope.canvas.height) + 'px');
        }

        // This is a workaround for browsers who have trouble with pointer-events on svgs
        element.bind('mousedown touchstart touchmove touchend', function (e) {
          $(".print-object:visible").each(function() {
            var mouseX = e.originalEvent.pageX;
            var mouseY = e.originalEvent.pageY;
            var offset = $(this).offset();
            var width = $(this).width();
            var height = $(this).height();

            if (e.type === 'touchend') {
             mouseX = e.originalEvent.changedTouches[0].pageX;
             mouseY = e.originalEvent.changedTouches[0].pageY;
            }

            if (mouseX > offset.left && mouseX < offset.left+width && mouseY > offset.top && mouseY < offset.top+height) {
              $(this).trigger(e);
            }
          });
        });
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .controller('EditNamesAndNumbersCtrl', ['$rootScope', '$scope','Design', 'DesignItem', 'PrintArea', 'Vinyl', 'VinylColors', 'Fonts', 'Color', 'display', '$analytics',
    function ($rootScope, $scope, Design, DesignItem, PrintArea, Vinyl, VinylColors, Fonts, Color, display, $analytics) {
      var defaultColor;
      var vinylFonts = Fonts.getVinylFonts();
      var hsv = Color.hex2hsv(DesignItem.color.hex);

      $scope.printArea = {};
      $scope.VinylColors = VinylColors;

      $scope.setFont = function (fontName) {
        $scope.printArea.vinyl.numbersFont = fontName;

        $analytics.eventTrack('personalize change - type', {category: 'design studio', label: fontName});
      };

      $scope.setColor = function (color) {
        $scope.printArea.vinyl.namesVinylColor = color;
        $scope.printArea.vinyl.namesVinylColorId = color.id;
        $scope.printArea.vinyl.numbersVinylColor = color;
        $scope.printArea.vinyl.numbersVinylColorId = color.id;

        $analytics.eventTrack('personalize change - color', {category: 'design studio', label: color.name});
      };

      $scope.toggleSide = function () {
        var sides = Design.getSides();
        var newSide = sides.filter(function (side) {
          return $scope.printArea.code !== side.code;
        }).shift();

        if (newSide) {
          $scope.changeSide(newSide.code);
          $scope.setDefaultPosition();
        }
      };

      $scope.changeSide = function (sidecode) {
        var newPrintArea = _.findWhere(Design.data.printAreas, {code: sidecode});

        newPrintArea.vinyl = angular.copy($scope.printArea.vinyl);

        $scope.printArea.vinyl.names = 0;
        $scope.printArea.vinyl.numbers = 0;
        $scope.printArea = newPrintArea;

        Design.setPrintAreaSide(sidecode);

        $analytics.eventTrack('personalize change - side', {category: 'design studio', label: newPrintArea.description});
      };

      $scope.toggleSize = function () {
        var sizeName;

        $scope.printArea.vinyl.size = $scope.printArea.vinyl.size == 4 ? 8 : 4;
        $scope.setDefaultPosition();

        sizeName = $scope.printArea.vinyl.size === 4 ? 'small' : 'large';

        $analytics.eventTrack('personalize change - size', {category: 'design studio', label: sizeName});
      };

      $scope.getFontAlias = function (fontName) {
        var font = _.findWhere(vinylFonts, {name: fontName});

        return angular.isDefined(font) && font.alias ?  font.alias : fontName;
      };

      $scope.toggleFont = function () {
        var fonts = _.reject(vinylFonts, function (font) {
          return font.name === $scope.printArea.vinyl.namesFont;
        });

        $scope.printArea.vinyl.namesFont = fonts.length ? _.first(fonts).name : _.first(vinylFonts).name;
        $scope.printArea.vinyl.numbersFont = $scope.printArea.vinyl.namesFont;
      };

      $scope.setDefaultPosition = function () {
        if ($scope.printArea.code === 'f') {
          $scope.printArea.vinyl.y = 2;

          if ($scope.printArea.vinyl.size <= 4) {
            $scope.printArea.vinyl.x = $scope.printArea.focusWidth / display.ppi / 2 + 3;
          } else {
            $scope.printArea.vinyl.x = $scope.printArea.focusWidth / display.ppi / 2;
          }
        } else {
          $scope.printArea.vinyl.y = 4;
          $scope.printArea.vinyl.x = $scope.printArea.focusWidth / display.ppi / 2;
        }
      };

      $scope.showWarning = function () {
        return Design.hasVinyl(Design.data) ? !Design.hasMatchingVinylQuantity() : false;
      };

      $scope.openNamesList = Vinyl.openModal;

      activate();


      $rootScope.$on('designLoaded', activate);

      function activate() {
        var side, sides = [];

        if (Design.hasVinyl(Design.data)) {
          $scope.printArea = Design.getVinylPrintArea(Design.data);

          if (angular.isDefined($scope.printArea.code) && PrintArea.data.code !== $scope.printArea.code) {
            Design.setPrintAreaSide($scope.printArea.code);
          }
        } else {
          sides = Design.getSides();
          side = _.findWhere(sides, {code: 'b'});
          side = side ? side : sides[0];

          $scope.printArea = _.findWhere(Design.data.printAreas, {code: side.code});

          if (hsv.s > 50 || hsv.v < 50) {
            defaultColor = _.findWhere(VinylColors.data, {name: 'White'});
          } else {
            defaultColor = _.findWhere(VinylColors.data, {name: 'Black'});
          }

          $scope.setColor(defaultColor);

          Design.setPrintAreaSide($scope.printArea.code);
        }
      }
  }]
);

(function(angular, WebFont) {
  'use strict';

  angular.module('designstudioApp').directive('vinylObject', ['MainMenu', 'PrintObject', vinylObject]);

    function vinylObject(MainMenu, PrintObject) {
      var directive = {
        scope: {
          vinyl: '=',
          pixelScale: '<',
          workspaceScale: '<',
        },
        restrict: 'E',
        replace: true,
        link: link,
        templateUrl: 'views/printobject/vinyl.html?ts=' + Date.now(),
      };

      return directive;

      function link(scope, element, attrs) {
        var startX, startY;

        scope.$watch('vinyl', loadFont, true);
        scope.$watch('workspaceScale', loadFont, true);

        scope.startDrag = startDrag;
        scope.stopDrag = stopDrag;
        scope.onClick = onClick;

        function loadFont() {
          var fontName = scope.vinyl.namesFont;
          var fontFileName = fontName.toLowerCase().replace(/ /g, '_');

          WebFont.load({
            custom: {
              families: [fontName],
              urls: ['font-face/' + fontFileName + '/stylesheet.css']
            },
            active: function () {
              render();
            }
          });
        }

        function render() {
          element.css({
            color: '#' + scope.vinyl.namesVinylColor.hex,
            fontFamily: scope.vinyl.namesFont
          });

          element.find('.vinyl-name').toggle(!!scope.vinyl.names).css('fontSize', getNameFontSize());
          element.find('.vinyl-number').toggle(!!scope.vinyl.numbers).css('fontSize', getNumberFontSize());
          element.css({
            top: getTop(),
            left: getLeft()
          });
        }

        function getNameFontSize() {
          return Math.floor(parseInt(scope.vinyl.size, 10) * scope.pixelScale * 0.30);
        }

        function getNumberFontSize() {
          return Math.floor(parseInt(scope.vinyl.size, 10) * scope.pixelScale);
        }

        function getTop() {
          var name = element.find('.vinyl-name');
          var top = scope.vinyl.y * scope.pixelScale - (name.height() * 0.65);

          top += scope.vinyl.names == 1 ? 0 : name.height();

          return Math.floor(top);
        }

        function getLeft() {
          var left = 0, offset = 0;

          // this is a special case to adjust for this font being slightly off center.
          if (scope.vinyl.namesFont === 'Porn Star Academy') {
            offset = 9 * scope.workspaceScale;
          }

          left = scope.vinyl.x * scope.pixelScale - (element.width() / 2);

          return Math.floor(left);
        }

        function startDrag(event, ui) {
          startX = event.clientX;
          startY = event.clientY;
        }

        function stopDrag(event, ui) {
          var newX = (event.clientX - startX) / scope.pixelScale;
          var newY = (event.clientY - startY) / scope.pixelScale;

          scope.vinyl.x = parseFloat(scope.vinyl.x) + newX;
          scope.vinyl.y = parseFloat(scope.vinyl.y) + newY;
        }

        function onClick() {
          PrintObject.set({});
          MainMenu.setActive('numbers');
        }
      }
    }
})(angular, WebFont);

'use strict';

angular.module('designstudioApp')
  .service('VinylColors', [function VinylColors() {
    var me = this;

    me.data = [];

    me.etl = function (designData) {
      me.data = designData.availableVinylColors;
    };
  }
]);

'use strict';

angular.module('designstudioApp')
  .controller('ShareDesignCtrl', ['$scope', '$window', 'Design', 'ShareModal', 'config', function ($scope, $window, Design, ShareModal, config) {
    var shareUrl = $window.location.origin + '/my-account/your-design/' + $window.btoa(Design.data.id);
    var zoomUrl = encodeURIComponent($window.location.origin + '/design/ZoomImage.php?src=' + Design.data.id + '_f&x=310&y=350&width=395&height=420&scale=1');
    var popupOptions = 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600';

    $scope.shareMenu = {
      submitted: false,
      loading: false,
      success: false,
      showEmail: false,
      data: {
        shareName: '',
        email: '',
        message: '',
        designId: Design.data.id,
        designName: Design.getName()
      }
    };

    $scope.close = ShareModal.close;

    $scope.shareMenu.facebook = function () {
      $scope.shareMenu.showEmail = false;
      $window.open('http://www.facebook.com/sharer.php?u=' + shareUrl, 'shareWithFacebook', popupOptions);
    };

    $scope.shareMenu.twitter = function () {
      var text = 'Rushordertees.com Design - ' + Design.data.name;

      $scope.shareMenu.showEmail = false;
      $window.open('http://twitter.com/share?text=' + encodeURIComponent(text) + "&url=" + shareUrl, 'shareWithTwitter', popupOptions);
    };

    $scope.shareMenu.pinterest = function () {
      $scope.shareMenu.showEmail = false;
      $window.open('http://pinterest.com/pin/create/button/?url=' + shareUrl + '&media=' + zoomUrl + '&description=My Design ' + Design.data.name, 'shareWithPinterest', popupOptions);
    };

    $scope.shareMenu.gplus = function () {
      $scope.shareMenu.showEmail = false;
      $window.open('https://plus.google.com/share?url=' + shareUrl,  'shareWithGooglePlus', popupOptions);
    };

    $scope.shareMenu.email = function () {
      $scope.shareMenu.showEmail = !$scope.shareMenu.showEmail;
    };


    $scope.shareMenu.share = function (data) {
      $scope.shareMenu.submitted = true;

      if ($scope.shareDesignForm.$valid === false) {
        return false;
      }

      $scope.shareMenu.loading = true;
      $scope.shareMenu.success = false;

      Design.share(data).then(function () {
        $scope.shareMenu.loading = false;
        $scope.shareMenu.success = true;
      });
    };
  }
]);

(function() {
  'use strict';

  angular.module('designstudioApp').controller('EditNamesListCtrl', ['Design', 'DesignItem', 'Vinyl', EditNamesListCtrl]);

  function EditNamesListCtrl(Design, DesignItem, Vinyl) {
    var me = this;
    var activeRow, activeItem;
    var printArea = Design.getVinylPrintArea(Design.data);
    var previewConfig = {};

    previewConfig.name = 'NAME';
    previewConfig.number = '00';
    previewConfig.size = '200';
    previewConfig.background = '#ff0000';

    me.cancel = Vinyl.closeModal;
    me.getProductItemUrl = DesignItem.getProductItemUrl;

    me.submitted = false;
    me.hasNames = printArea.vinyl.names > 0;
    me.hasNumbers = printArea.vinyl.numbers > 0;
    me.items = Vinyl.getItemsFlatNamesList(Design.data.designItems);
    me.vinyl = printArea.vinyl;

    activeItem = me.items.slice(0, 1).shift();
    activeRow = activeItem.namesList.slice(0, 1).shift();

    me.changeActiveRow = function (row, item) {
      activeRow = row;
      activeItem = item;
    };

    me.getPreviewConfig = function () {
      previewConfig.name = activeRow.name;
      previewConfig.number = activeRow.number;
      previewConfig.background = activeItem.colorHex;

      return previewConfig;
    };

    me.showWarning = function showWarning() {
      return Design.hasVinyl(Design.data) ? !Design.hasMatchingVinylQuantity() : false;
    };

    me.changeSize = function (item, row) {
      var selectedSize = _.findWhere(item.availableSizes, {uid: row.uid});

      row.catalogItemId = selectedSize.catalogItemId;
      row.catalogItemSizeId = selectedSize.catalogItemSizeId;
    };

    me.deleteRow = function (item, index) {
      item.namesList.splice(index, 1);
    };

    me.addRow = function (item) {
      item.namesList.push({name: '', number: ''});
    };

    me.save = function () {
      me.submitted = true;

      if (me.form.$invalid === true) {
        return;
      }

      Vinyl.saveFlatList(Design.data.designItems, me.items);
      Vinyl.closeModal();
    };
  }
})();

'use strict';

angular.module('designstudioApp')
  .service('Vinyl', ['$uibModal', function Vinyl($uibModal) {
    var me = this;
    var modalInstance;

    me.openModal = function openModal() {
      modalInstance = $uibModal.open({
        templateUrl: 'views/modal/nameslist.html?ts='+Date.now(),
        controller: 'EditNamesListCtrl',
        controllerAs: 'namesList',
        backdrop: 'static',
        keyboard: false,
        windowClass: 'namesList-modal',
        animation: false,
        size: 'lg'
      });
    };

    me.closeModal = function closeModal() {
      modalInstance.close();
    };

    me.getQuantity = function getQuantity(sizeGroups) {
      var count = 0;

      for (var i = sizeGroups.length - 1; i >= 0; i--) {
        for (var j = sizeGroups[i].sizes.length - 1; j >= 0; j--) {
          count += sizeGroups[i].sizes[j].namesList.length;
        }
      }

      return count;
    };

    me.getItemsFlatNamesList = function getItemsFlatNamesList(designItems) {
      var flat = [], item;

      for (var i = designItems.length - 1; i >= 0; i--) {
        for (var j = designItems[i].colors.length - 1; j >= 0; j--) {
          item = {
            uid: _.uniqueId(),
            id: designItems[i].catalogItemId,
            style: designItems[i].style,
            catalogLabel: designItems[i].catalogLabel,
            colorId: designItems[i].colors[j].id,
            colorCode: designItems[i].colors[j].code,
            colorHex: designItems[i].colors[j].hex,
            colorName: designItems[i].colors[j].name,
            namesList: getFlatNamesList(designItems[i].colors[j].sizes),
            availableSizes: getAvailableSizes(designItems[i].colors[j].sizes)
          };

          setExistingUID(item.availableSizes, item.namesList);

          if (item.namesList.length === 0 && designItems[i].colors.length === 1) {
            item.namesList.push({name: '', number: ''});
            item.namesList.push({name: '', number: ''});
            item.namesList.push({name: '', number: ''});
          } else if(item.namesList.length === 0) {
            item.namesList.push({name: '', number: ''});
          }

          flat.push(item);
        }
      }

      flat.reverse();

      return flat;
    };

    me.saveFlatList = function saveFlatList(designItems, flatList) {
      var list, color;

      for (var i = flatList.length - 1; i >= 0; i--) {
        list = convertNamesList(flatList[i].namesList);
        color = getItemColor(designItems, flatList[i].id, flatList[i].colorId);
        color = color.sizes = mergeNamesList(color.sizes, list);
      }
    };

    function convertNamesList(namesList) {
      var output = {};

      for (var i = namesList.length - 1; i >= 0; i--) {
        if (angular.isUndefined(output[namesList[i].catalogItemId])) {
          output[namesList[i].catalogItemId] = {};
        }

        if (angular.isUndefined(output[namesList[i].catalogItemId][namesList[i].catalogItemSizeId])) {
          output[namesList[i].catalogItemId][namesList[i].catalogItemSizeId] = [];
        }

        output[namesList[i].catalogItemId][namesList[i].catalogItemSizeId].push(namesList[i]);
      }

      return output;
    }

    function getItemColor(designItems, catalogItemId, catalogItemColorId) {
      for (var i = designItems.length - 1; i >= 0; i--) {
        if (designItems[i].catalogItemId != catalogItemId) {
          continue;
        }

        for (var j = designItems[i].colors.length - 1; j >= 0; j--) {
          if (designItems[i].colors[j].id != catalogItemColorId) {
            continue;
          }

          return designItems[i].colors[j];
        }
      }
    }

    function mergeNamesList(sizeGroups, namesList) {
      var catalogItemId, catalogItemSizeId;

      sizeGroups = angular.copy(sizeGroups);

      for (var i = sizeGroups.length - 1; i >= 0; i--) {
        for (var j = sizeGroups[i].sizes.length - 1; j >= 0; j--) {
          sizeGroups[i].sizes[j].quantity = 0;
          sizeGroups[i].sizes[j].namesList = [];

          catalogItemId = sizeGroups[i].catalogItemId;
          catalogItemSizeId = sizeGroups[i].sizes[j].catalogItemSizeId;

          if(angular.isUndefined(namesList[catalogItemId])) {
            continue;
          }

          if(angular.isUndefined(namesList[catalogItemId][catalogItemSizeId])) {
            continue;
          }

          for (var k = namesList[catalogItemId][catalogItemSizeId].length - 1; k >= 0; k--) {
            sizeGroups[i].sizes[j].quantity += 1;

            if (namesList[catalogItemId][catalogItemSizeId][k].name.length > 0 || namesList[catalogItemId][catalogItemSizeId][k].number.length > 0) {

              sizeGroups[i].sizes[j].namesList.push({
                name: namesList[catalogItemId][catalogItemSizeId][k].name,
                number: namesList[catalogItemId][catalogItemSizeId][k].number
              });

            }
          }
        }
      }

      return sizeGroups;
    }

    function setExistingUID(availableSizes, flatNamesList) {
      var existing;

      for (var i = flatNamesList.length - 1; i >= 0; i--) {
        existing = _.findWhere(availableSizes, {catalogItemId: flatNamesList[i].catalogItemId, catalogItemSizeId: flatNamesList[i].catalogItemSizeId});
        flatNamesList[i].uid = existing.uid;
      }
    }

    function getAvailableSizes(sizeGroups) {
      var output = [];

      for (var i = sizeGroups.length - 1; i >= 0; i--) {
        for (var j = sizeGroups[i].sizes.length - 1; j >= 0; j--) {
          output.unshift({
            uid: _.uniqueId(),
            label: sizeGroups[i].sizeType + ' ' + sizeGroups[i].sizes[j].sizeCode,
            catalogItemId: sizeGroups[i].catalogItemId,
            catalogItemSizeId: sizeGroups[i].sizes[j].catalogItemSizeId
          });
        }
      }

      return output;
    }

    function getFlatNamesList(sizeGroups) {
      var row = {};
      var list = {};
      var output = [];
      var sizeType;
      var sizeCode;

      sizeGroups = angular.copy(sizeGroups);

      for (var i = sizeGroups.length - 1; i >= 0; i--) {
        sizeType = sizeGroups[i].sizeType;

        if (angular.isUndefined(list[sizeGroups[i].sizeType])) {
          list[sizeType] = {};
        }

        for (var j = sizeGroups[i].sizes.length - 1; j >= 0; j--) {
          sizeCode = sizeGroups[i].sizes[j].sizeCode;

          if (angular.isUndefined(list[sizeType][sizeCode])) {
            list[sizeType][sizeCode] = [];
          }

          if (angular.isUndefined(sizeGroups[i].sizes[j].namesList)) {
            sizeGroups[i].sizes[j].namesList = [];
          }

          for (var k = sizeGroups[i].sizes[j].namesList.length - 1; k >= 0; k--) {
            row = angular.copy(sizeGroups[i].sizes[j].namesList[k]);
            row.catalogItemId = sizeGroups[i].catalogItemId;
            row.catalogItemSizeId = sizeGroups[i].sizes[j].catalogItemSizeId;
            row.sortOrder = sizeGroups[i].sizes[j].sortOrder;

            list[sizeType][sizeCode].unshift(row);
          }

          if (list[sizeType][sizeCode].length < sizeGroups[i].sizes[j].quantity) {
            for (var k = sizeGroups[i].sizes[j].quantity - list[sizeType][sizeCode].length - 1; k >= 0; k--) {
              row = {
                name: '',
                number: '',
                catalogItemId: sizeGroups[i].catalogItemId,
                catalogItemSizeId: sizeGroups[i].sizes[j].catalogItemSizeId,
                sortOrder: sizeGroups[i].sizes[j].sortOrder
              };

              list[sizeType][sizeCode].push(row);
            }
          }
        }
      }

      for (var sizeType in list) {
        for (var sizeCode in list[sizeType]) {
          for (var i = 0; i < list[sizeType][sizeCode].length; i++) {
            output.push(list[sizeType][sizeCode][i]);
          }
        }
      }

      output = _.sortBy(output, function (row) {
        return row.sortOrder;
      });

      return output;
    }
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('numericOnly', [function () {
    return {
      restrict: 'A',
      scope: {
      },
      require: '^ngModel',
      link: function postLink(scope, element, attrs, ngModelCrtl) {
        var min = attrs.min ? parseFloat(attrs.min) : -Infinity;
        var max = attrs.max ? parseFloat(attrs.max) : Infinity;
        var decimalPrecision = attrs.decimalPrecision ? parseInt(attrs.decimalPrecision, 10) : 0;

        element.on('change', function (event) {
          var value = element.val();

          value = (value).toString().replace(/(?!^-)[^0-9.]/gi, '');

          if (value.length === 0 || (value).toString().replace(/[^0-9]/gi, '').length === 0) {
            value = 0;
          }

          if (value > max) {
            value = max;
          } else if (value < min) {
            value = min;
          }

          value = parseFloat(value).toFixed(decimalPrecision);

          ngModelCrtl.$setViewValue(value);
          ngModelCrtl.$render();

          scope.$apply();
        });
      }
    };
  }
]);

'use strict';

angular.module('designstudioApp')
  .controller('MainFooterCtrl', ['$scope', '$timeout', 'Design', 'DesignItem', 'PrintArea', 'CheckoutModal', 'QuantitiesModal', 'SaveDesignModal', 'ShareModal', 'Viewport', 'MainMenu', 'PrintObject',
  function ($scope, $timeout, Design, DesignItem, PrintArea, CheckoutModal, QuantitiesModal, SaveDesignModal, ShareModal, Viewport, MainMenu, PrintObject) {

    $scope.$on('designLoaded', function (event, design) {
      if (Viewport.isExtraSmall()) {
        return false;
      }

      var watch = $scope.$watch('Design.data.printAreas', function (newValue, oldValue) {
        if (newValue !== oldValue) {
          if (!Design.getId()) {
            $timeout(function () {
              $scope.savePopOver.show = true;
            }, 12000);
          }
          watch();
        }
      }, true);
    });

    $scope.Design = Design;
    $scope.DesignItem = DesignItem;
    $scope.PrintArea = PrintArea;
    $scope.printMethodCode = Design.getPrintMethodCode();
    $scope.methodPopover = {
      show: false,
      message: 'We do not offer embroidery on this product online.  We can assist you by phone with this at 1-800-620-1233.'
    };

    $scope.openSaveModal = openSaveModal;
    $scope.onPrintMethodToggle = onPrintMethodToggle;
    $scope.hasBothMethods = hasBothMethods;
    $scope.choosePlatform = choosePlatform;

    $scope.savePopOver = {
      show: false
    }

    $scope.$on('catalogItemSet', function onCatalogItemSet() {
      $scope.printMethodCode = Design.getPrintMethodCode();
    });

    $scope.$on('printMethodSet', function onPrintMethodSet() {
      $scope.printMethodCode = Design.getPrintMethodCode();
    });

    $scope.$on('printAreaSet', function onPrintAreaSet() {
      $scope.printMethodCode = Design.getPrintMethodCode();
    });

    $scope.$on('designLoaded', function onDesignLoaded() {
      $scope.printMethodCode = Design.getPrintMethodCode();
    });

    $scope.openProductMenu = function () {
      MainMenu.setActive('editProduct');
    };

    function openSaveModal() {
      SaveDesignModal.open({
        onSuccess: function () {
          return ShareModal.open;
        }
      });
      PrintObject.set({});
    }

    function choosePlatform() {
      if (Design.hasMinQuantity() && Design.isLowVolume() === false) {
        CheckoutModal.open();
      } else {
        QuantitiesModal.open();
      }

       MainMenu.setActive(false);
       PrintObject.set({});
    }

    function onPrintMethodToggle($event) {
      if (Design.data.designItems.length === 1 && hasBothMethods()) {
        $scope.printMethodCode = $scope.printMethodCode === 'scr' ? 'emb': 'scr';
        Design.setPrintMethodByCode($scope.printMethodCode);
      } else {
        $scope.methodPopover.show = !$scope.methodPopover.show;
        if ($scope.printMethodCode === 'emb') {
          $scope.methodPopover.message = 'We do not offer screen printing on this product online.  We can assist you by phone with this at 1-800-620-1233.';
        } else {
          $scope.methodPopover.message = 'We do not offer embroidery on this product online.  We can assist you by phone with this at 1-800-620-1233.';
        }
      }
    }

    function hasBothMethods() {
      var pms = DesignItem.getPrintMethodsCodes();

      return pms.indexOf('emb') > -1 && pms.indexOf('scr') > -1;
    }
  }
]);

'use strict';

angular.module('designstudioApp')
  .directive('whenScrolled', ["$parse", function ($parse) {
    return {
      restrict: 'A',
      scope: false,
      link: function postLink(scope, element, attrs) {
        var loadMore = $parse(attrs['whenScrolled']);

        element.bind('scroll', function () {
          if ((element[0].scrollHeight - element.scrollTop() - 5) <= element.outerHeight()) {
            loadMore(scope, {menuHeight: element[0].clientHeight, menuWidth: element[0].clientWidth});
            scope.$digest();
          }
        });

        attrs.$observe('whenScrolledHook', function (newValue, oldValue) {
          if (newValue === 'true' && newValue !== oldValue) {
            loadMore(scope, {menuHeight: element[0].clientHeight, menuWidth: element[0].clientWidth});
          }
        });
      }
    };
}]);

'use strict';

angular.module('designstudioApp')
  .directive('placeholderIf', [function () {
    return {
      restrict: 'A',
      scope: false,
      require: '^ngModel',
      link: function postLink(scope, element, attrs, ngModelCrtl) {

        ngModelCrtl.$formatters.push(function(value){
            return scope.$eval(attrs.placeholderIf) ? '' : value;
        });

      }
    };
  }
]);

'use strict';

angular.module('designstudioApp')
  .factory('TextObject', [function() {

    var getBounds = function getBounds(children) {
      return {
        top: _.min(children, function(child){ return child.getBoundingClientRect().top; }).getBoundingClientRect().top,
        right: _.max(children, function(child){ return child.getBoundingClientRect().right; }).getBoundingClientRect().right,
        bottom: _.max(children, function(child){ return child.getBoundingClientRect().bottom; }).getBoundingClientRect().bottom,
        left: _.min(children, function(child){ return child.getBoundingClientRect().left; }).getBoundingClientRect().left
      };
    };

    var getFlatDimensions = function getFlatDimensions(textString, cssConfig) {
      var dims = {}, element = angular.element('<div></div>');

      element.css({
        position: 'absolute',
        left: '-100%',
        visibility: 'hidden',
        whiteSpace: 'nowrap',
        lineHeight: 'normal'
      });

      textString = textString.trim().length === 0 ? '.' : textString;

      element.text(textString);
      element.css(cssConfig);

      angular.element('body').append(element);

      dims.width = element.width();
      dims.height = element.height();

      element.remove();

      dims.width = dims.width >= 1 ? dims.width : 1;

      return dims;
    };

    var getBoundingBox = function getBoundingBox(children) {
      var bounds = getBounds(children);

      return {
        width: bounds.right - bounds.left,
        height: bounds.bottom - bounds.top
      }
    };

    return {
      getBoundingBox: getBoundingBox,
      getFlatDimensions: getFlatDimensions
    };
  }
]);

'use strict';

angular.module('designstudioApp')
  .factory('Point', [function() {
    return function (x, y) {
      this.x = x;
      this.y = y;
    };
  }]);

'use strict';

angular.module('designstudioApp')
  .factory('Circle', ['RightTriangle', 'Point', function(RightTriangle, Point) {
    return function(radius) {
      this.radius = radius;

      this.getArcCoordinates = function getArcCoordinates(angle, adjustment) {
        if(!adjustment){
            adjustment = 0;
        }
        angle = angle % 360;
        var origin, dest, adjustedAngle;

        if(angle < 0) {
            origin = this.getPoint(270 + angle/2 + adjustment);
            dest = this.getPoint(270 - angle/2 + adjustment);

        }else{
            origin = this.getPoint(90 + angle - angle/2 + adjustment);
            dest = this.getPoint(90 - angle/2 + adjustment);
        }

        return {
            origin: origin,
            dest: dest
        };
      };

      this.getPoint = function getPoint(angle) {
        angle = angle % 360;
        if(angle <0){
            angle += 360;
        }

        var tri = new RightTriangle( angle % 90, null, null, this.radius );

        if(angle < 90){
            //    /_
            return new Point(tri.a, -tri.o);
        }else if(angle < 180){
            //    \_
            return new Point(-tri.o, -tri.a);
        }else if(angle < 270){
            //     _
            //    /
            return new Point(-tri.a, tri.o);
        }else if(angle < 360){
            //    _
            //    \
            return new Point(tri.o, tri.a);
        }
      };
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .factory('RightTriangle', [function() {

    var DegToRad = function DegToRad(angle) {
      return angle * (Math.PI / 180);
    }

    return function (ang, o, a, h) {
      //SOH CAH TOA
      //        a
      //    C_______A
      //    |_|   (/ ang
      //    |     /
      //    |    /
      //   o|   / h
      //    |  /
      //    | /
      //    |/coAng
      //    B
      //
      this.ang = ang;
      this.coAng = 90 - ang;
      ang = DegToRad(ang);

      if ( o ){

          this.o = o;
          this.a = o/Math.tan(ang);
          this.h = o/Math.sin(ang);

      } else if(  a ){

          this.a = a;
          this.o = Math.tan * a;
          this.h = a/Math.cos(ang);

      } else if(h){
          this.h = h;
          this.o = Math.sin(ang) * h;
          this.a = Math.cos(ang) * h;
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .factory('TextObjectLine', ['Circle', function (Circle) {

    var comparePoints = function comparePoints(points){
        var left = false, top = false, right = false, bottom = false;

        for(var n in points){
            var point = points[n];
            if(left === false || point.x < left){
                left = point.x;
            }
            if(top === false || point.y < top){
                top = point.y;
            }
            if(right === false || point.x > right){
                right = point.x;
            }
            if(bottom === false || point.y > bottom){
                bottom = point.y;
            }
        }
        return {left:left, top:top, right:right, bottom:bottom};
    }

    return function (config) {
      var me = this;

      _.extend(me, config);

      me.getBounds = function getBounds() {
        if(me.text.length==0){
            return false;
        }
        if(me.angle == 0 ){
            return {left:-me.dimensions.width/2, top:-me.dimensions.height/2 + me.radialModifier, right:me.dimensions.width/2, bottom:me.dimensions.height/2  + me.radialModifier};
        }


        var radius = me.radius + me.dimensions.height
        var boundingCircle = new Circle(me.radius + me.dimensions.height * 0.65);
        var baselineCircle = new Circle(me.radius - me.dimensions.height * 0.35);
        var topPoint = boundingCircle.getPoint(90);
        var leftPoint = boundingCircle.getPoint(180);
        var rightPoint = boundingCircle.getPoint(0);
        var bottomPoint = boundingCircle.getPoint(270);
        var coordinates, baselineCoordinates, originSector, destSector;


                // var s = Snap();
                // var bound = s.circle(400, 400, me.radius + me.dimensions.height * 0.65);
                // var base = s.circle(400, 400, me.radius);
                // var tp = s.circle(400 + topPoint.x, 400 + topPoint.y, 2);
                // var lp = s.circle(400 + leftPoint.x, 400 + leftPoint.y, 2);
                // var bp = s.circle(400 + rightPoint.x, 400 + rightPoint.y, 2);
                // var rp = s.circle(400 + bottomPoint.x, 400 + bottomPoint.y, 2);


                // base.attr({
                //   fill: 'red'
                // });

                // bound.attr({
                //   fill: 'green'
                // });



        switch (me.align){
            case 'alignLeft':

               coordinates = boundingCircle.getArcCoordinates(me.angle, (me.fullAngle - me.angle)/2);
               baselineCoordinates = baselineCircle.getArcCoordinates(me.angle, (me.fullAngle - me.angle)/2);

           break;
            case 'alignRight':
               coordinates = boundingCircle.getArcCoordinates(me.angle, (me.angle - me.fullAngle)/2);
               baselineCoordinates = baselineCircle.getArcCoordinates(me.angle, (me.angle - me.fullAngle)/2);

            break;
            case 'alignCenter':
            default:
                coordinates = boundingCircle.getArcCoordinates(me.angle, 0);
                baselineCoordinates = baselineCircle.getArcCoordinates(me.angle, 0);

            break;

        }

                // var p1 = s.circle(400 + coordinates.origin.x, 400 + coordinates.origin.y, 2).attr({fill: 'blue'});
                // var p2 = s.circle(400 + coordinates.dest.x, 400 + coordinates.dest.y, 2).attr({fill: 'blue'});
                // var p3 = s.circle(400 + baselineCoordinates.origin.x, 400 + baselineCoordinates.origin.y, 2).attr({fill: 'blue'});
                // var p4 = s.circle(400 + baselineCoordinates.dest.x, 400 + baselineCoordinates.dest.y, 2).attr({fill: 'blue'});


        if(coordinates.origin.x > 0){
            originSector = coordinates.origin.y > 0 ? 4 : 1;
        }else{
            originSector = coordinates.origin.y > 0 ? 3 : 2;
        }

        if(coordinates.dest.x > 0){
            destSector = coordinates.dest.y > 0 ? 4 : 1;
        }else{
            destSector = coordinates.dest.y > 0 ? 3 : 2;
        }

        if(me.angle < 0){
            var tmpSector = destSector;

            destSector = originSector;
            originSector = tmpSector;
        }

        if(originSector == destSector){

            var boundResults = comparePoints([coordinates.origin, baselineCoordinates.origin, coordinates.dest, baselineCoordinates.dest ]);

        }else if(destSector == 1){
            if(originSector ==2){
                var boundResults = comparePoints([topPoint, coordinates.origin, baselineCoordinates.origin, coordinates.dest, baselineCoordinates.dest ]);
            }else if(originSector ==3){
                var boundResults = comparePoints([topPoint, leftPoint, coordinates.origin, baselineCoordinates.origin, coordinates.dest, baselineCoordinates.dest ]);
            }else if(originSector ==4){
                var boundResults = comparePoints([topPoint, leftPoint, bottomPoint, coordinates.origin, baselineCoordinates.origin, coordinates.dest, baselineCoordinates.dest ]);
            }

        }else if(destSector == 2){
            if(originSector ==3){
                var boundResults = comparePoints([leftPoint, coordinates.origin, baselineCoordinates.origin, coordinates.dest, baselineCoordinates.dest ]);
            }else if(originSector ==4){
                var boundResults = comparePoints([leftPoint, bottomPoint, coordinates.origin, baselineCoordinates.origin, coordinates.dest, baselineCoordinates.dest ]);
            }else if(originSector ==1){
                var boundResults = comparePoints([leftPoint, bottomPoint, rightPoint, coordinates.origin, baselineCoordinates.origin, coordinates.dest, baselineCoordinates.dest ]);
            }

        }else if(destSector == 3){
            if(originSector ==4){
                var boundResults = comparePoints([bottomPoint, coordinates.origin, baselineCoordinates.origin, coordinates.dest, baselineCoordinates.dest ]);
            }else if(originSector ==1){
                var boundResults = comparePoints([bottomPoint, rightPoint, coordinates.origin, baselineCoordinates.origin, coordinates.dest, baselineCoordinates.dest ]);
            }else if(originSector ==2){
                var boundResults = comparePoints([bottomPoint, rightPoint, topPoint, coordinates.origin, baselineCoordinates.origin, coordinates.dest, baselineCoordinates.dest ]);
            }

        }else if(destSector == 4){
            if(originSector ==1){
                var boundResults = comparePoints([rightPoint, coordinates.origin, baselineCoordinates.origin, coordinates.dest, baselineCoordinates.dest ]);
            }else if(originSector ==2){
                var boundResults = comparePoints([rightPoint, topPoint, coordinates.origin, baselineCoordinates.origin, coordinates.dest, baselineCoordinates.dest ]);
            }else if(originSector ==3){
                var boundResults = comparePoints([rightPoint, topPoint, leftPoint, coordinates.origin, baselineCoordinates.origin, coordinates.dest, baselineCoordinates.dest ]);
            }

        }
        return boundResults;
      }
    };

  }]
);

'use strict';

angular.module('designstudioApp')
  .factory('RenderQueue', ['$rootScope', 'PrintArea', function ($rootScope, PrintArea) {
    var data = {
      queueLength: 0
    };

    $rootScope.$on('printAreaSet', function (event, printArea) {
      data.queueLength = 0;
    });

    return {
      data: data,
      reset: function reset() {
        data.queueLength = 0;
      },
      increment: function increment() {
        data.queueLength += 1;
      },
      decrement: function decrement() {
        data.queueLength = data.queueLength > 0 ? data.queueLength - 1 : 0;
      },
      isRendered: function isRendered() {
        return data.queueLength === 0;
      }
    };
  }
]);

'use strict';

angular.module('designstudioApp')
  .directive('autoFocus', [function () {
    return {
      restrict: 'A',
      scope: false,
      link: function postLink(scope, element, attrs) {
        // timeout has to be higher than the css menu transition
        setTimeout(function () {
          element.focus();
        }, 300);
      }
    };
  }
]);

'use strict';

angular.module('designstudioApp')
  .factory('DesignSave', ['$q', '$window', 'Design', 'User', 'JSONService', 'APIService', 'StudioMode', 'IP', '$uibModal', function ($q, $window, Design, User, JSONService, APIService, StudioMode, IP, $uibModal) {

    var protectedEmails = ['designidea@rushordertees.com'];

    function isExistingSession() {
      return !!Design.getId();
    }

    function isClean() {
      return Design.isClean();
    }

    function checkout() {
      var modal = $uibModal.open({
        size: 'sm',
        keyboard: false,
        backdrop: true,
        template: '<div class="text-center"><p>Adding Your Design to Your Cart...</p><img src="images/spinner.gif" alt="is loading"></div>'
      });

      return modal.opened.then(function () {
        return $window.location = '/checkout/add-design/?id=' + Design.getId();
      });
    }

    function buyNow() {
      setData(getExistingData());
      return Design.save(Design.data, null).then(checkout);
    }

    function checkIfExisting(data) {
      return APIService.isExistingDesign(data);
    }

    function hasActiveOrder(data) {
      return JSONService.hasActiveOrder(data);
    }

    function getDefaultName() {
      return 'My Cool Design 1';
    }

    function save(saveConfig) {
      var isCorporateIP = IP.isCorporate();

      saveConfig = (angular.isDefined(saveConfig)) ? saveConfig : null;

      if (isCorporateIP === false && isEmailProtected(Design.data.user.email)) {
        $window.alert('The email address you have used is reserved by RushOrderTees. Please choose another address.');

        return $q.reject();
      }

      return Design.save(Design.data, saveConfig).then(function (design) {
        if (User.isLoggedIn() === false) {
          User.login(Design.getEmail());
        }

        return $q.when(design);
      });
    }

    function getExistingData() {
      var data = {email: '', name: ''};

      if(Design.getOriginalEmail()) {
        data.email = Design.getOriginalEmail();
      } else if (isExistingSession()) {
        data.email = Design.getEmail();
      } else {
        data.email = User.getEmail();
      }

      data.name = Design.getName();

      return data;
    }

    function setData(data) {
      Design.data.name = data.name;
      Design.data.user = {};
      Design.data.user.email = data.email;
    }

    function isEmailProtected(email) {
      return protectedEmails.some(function (protectedEmail) {
        return email.toLowerCase() === protectedEmail;
      });
    }

    return {
      save: save,
      setData: setData,
      buyNow: buyNow,
      checkout: checkout,
      isClean: isClean,
      getExistingData: getExistingData,
      getDefaultName: getDefaultName,
      checkIfExisting: checkIfExisting,
      hasActiveOrder: hasActiveOrder,
      isExistingSession: isExistingSession
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .factory('MarinTracker', ['$window', function MarinTracker($window) {
    function track(id, type) {
      var _mTrack = $window._mTrack || [];

      _mTrack.push(['addTrans', {
          items : [{
              orderId : id,
              convType : type,
          }]
      }]);

      _mTrack.push(['processOrders']);
    };

    return {
      track: track
    };
}]);

'use strict';

angular.module('designstudioApp')
  .service('MultipleObjectSelection', [function MultipleObjectSelection() {
    var me = this;

    var multiSelect = false;

    me.isMultiSelect = function () {
      return multiSelect;
    };

    me.setMultiSelect = function (value) {
      multiSelect = value;
    };

  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('menuPrintArea', [function () {
    return {
      templateUrl: 'views/menu/printArea.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: false,
      link: function postLink(scope, element, attrs, menuCtrl) {
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('menuLogin', [ function () {
    return {
      templateUrl: 'views/menu/login.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: false
    };
  }]
);

(function() {
  'use strict';

  angular.module('designstudioApp').controller('LoginCtrl', ['$scope', 'User', 'LoginModal', 'DesignsModal', 'onSuccess', LoginCtrl]);

  function LoginCtrl($scope, User, LoginModal, DesignsModal, onSuccess) {
    var me = this;

    me.email = '';
    me.error = false;
    me.submitted = false;

    me.close = LoginModal.close;
    me.submit = function submit(email) {
      var promise;

      me.error = false;
      me.submitted = true;

      if (me.form.$valid === false) {
        return false;
      }

      me.requestActive = true;
      promise = User.login(email);

      promise.success(function () {
        LoginModal.close();
        onSuccess();
      }).error(function() {
        me.error = true;
      });

      promise['finally'](function () {
        me.requestActive = false;
      });
    };
  }
})();

'use strict';

angular.module('designstudioApp')
  .directive('menuDesigns', [ function () {
    return {
      templateUrl: 'views/menu/designs.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: false
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .controller('DesignsCtrl', ['$scope', '$window', 'User', 'DesignsModal', function ($scope, $window, User, DesignsModal) {
    $scope.designs = [];
    $scope.userEmail = User.getEmail();
    $scope.designsMenu = {
      requestActive: true
    };

    User.getDesigns().success(function (response) {
      $scope.designs = response.data;
      $scope.designsMenu.requestActive = false;
    });

    $scope.load = function (designId) {
      $window.location = $window.location.pathname + '#/?design=' + $window.btoa(designId);
      $window.location.reload();
    };

    $scope.logout = function () {
      User.logout();
      DesignsModal.close();
    };

    $scope.close = DesignsModal.close;
  }
]);

'use strict';

angular.module('designstudioApp')
  .directive('designpreviewOnHover', [function () {
    return {
      restrict: 'A',
      scope: false,
      link: function postLink(scope, element, attrs) {
        var width = 130;
        var height = 211;
        var designId = attrs['designpreviewOnHover'];

        element.on('mouseenter',onEnter).on('mouseleave', onLeave);
        scope.$on('$destroy', onLeave);

        function getPreviewURL(id, side, w, h) {
          return 'ZoomImage.php?src=' + id + '_' + side +'&x=370&y=320&width=' + w + '&height=' + h + '&ext=jpg&scale=0.5';
        }

        function onEnter() {
          var offset = element.offset();
          var previewer = angular.element('<div></div>').addClass('designpreviewer');
          var front = angular.element('<img>').addClass('designpreviewer-img').attr({'src': getPreviewURL(designId, 'f', width, height), width: width, height: height});
          var back = angular.element('<img>').addClass('designpreviewer-img').attr({'src': getPreviewURL(designId, 'b', width, height), width: width, height: height});

          previewer.append(front).append(back).css({'top': offset.top, 'left': offset.left + 100});
          angular.element('body').append(previewer);
        }

        function onLeave() {
          angular.element('.designpreviewer').remove();
        }
      }
    };
  }
]);

angular.module('designstudioAppFilters', [])
	.filter('replaceAll', function() {
		return function (input, searchPattern, scope, newStr) {
			var regex = new RegExp(searchPattern, scope);
			return input.replace(regex, newStr);
		};
	});
'use strict';

angular.module('designstudioApp')
  .service('UploadMultiColor', ['$uibModal', function UploadMultiColor($uibModal) {
    var me = this;
    var modalInstance;

    me.openModal = function openModal() {
      if (modalInstance) {
        modalInstance.close();
      }

      modalInstance = $uibModal.open({
        templateUrl: 'views/modal/upload-multicolor.html?ts='+Date.now(),
        controller: 'EditUploadObjectCtrl',
        windowClass: 'upload-multicolor-modal',
        backdrop: 'static',
        keyboard: false,
        size: 'md'
      });
    };

    me.closeModal = function closeModal() {
      modalInstance.close();
    };
  }]
);

(function() {
  'use strict';

  angular.module('designstudioApp').factory('CheckoutModal', ['$uibModal', 'Design', 'Promo', CheckoutModal]);

  function CheckoutModal($uibModal, Design, Promo) {
    var modalInstance;

    var service = {
      open: openModal,
      close: closeModal,
    };

    return service;

    function openModal(data) {
      modalInstance = $uibModal.open({
        templateUrl: 'views/modal/checkout.html?ts='+Date.now(),
        controller: 'CheckoutCtrl',
        controllerAs: 'checkout',
        keyboard: true,
        backdrop: true,
        size: 'lg',
        windowClass: 'checkout-modal',
        resolve: {
          data: function () {
            return data;
          }
        }
      });

      Design.deleteEmptyTextObjects();
    }

    function closeModal() {
      modalInstance.close();
    }
  }
})();

'use strict';

angular.module('designstudioApp')
  .service('Color', [function Color() {
    var me = this;

    me.hex2rgb = hex2rgb;
    me.hex2hsv = hex2hsv;
    me.rgb2hex = rgb2hex;
    me.isHexDark = isHexDark;

    function isHexDark(hex) {
      var hsl = hex2hsl(hex);

      return hsl.l < 0.50;
    }

    function expandHex(hex) {
      var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;

      hex = hex.replace(shorthandRegex, function(m, r, g, b) {
          return r + r + g + g + b + b;
      });

      return hex;
    }

    function hex2rgb(hex) {
      hex = expandHex(hex);
      hex = hex.replace('#', '');

      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
      };
    }

    function rgb2hex(r, g, b) {
      return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function rgb2hsv(rgb) {
      var max = Math.max(rgb.r, rgb.g, rgb.b);
      var diff = max - Math.min(rgb.r, rgb.g, rgb.b);
      var hsv = {
        h: 0,
        s: 0,
        v: 0
      };

      // saturation
      hsv.s = max === 0 ? 0 : 100 * diff / max;

      // hue
      if (hsv.s === 0) {
        hsv.h = 0;
      } else if (rgb.r === max) {
        hsv.h = 60 * (rgb.g - rgb.b) / diff;
      } else if (rgb.g === max) {
        hsv.h = 120 + 60 * (rgb.b - rgb.r) / diff;
      } else {
        hsv.h = 240 + 60 * (rgb.r - rgb.g) / diff;
      }

      if (hsv.h < 0) {
        hsv.h += 360;
      }

      hsv.h = Math.round(hsv.h);
      hsv.s = Math.round(hsv.s);
      hsv.v = Math.round(max * 100 / 255);

      return hsv;
    }

    function hex2hsv(hex) {
      return rgb2hsv(hex2rgb(hex));
    }

    function hex2hsl(hex) {
      return rgb2Hsl(hex2rgb(hex));
    }

    function rgb2Hsl(rgb) {
      var r = rgb.r / 255;
      var g = rgb.g / 255;
      var b = rgb.b / 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var h, s, l = (max + min) / 2;

      if (max == min) {
        h = s = 0; // achromatic
      } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }

        h /= 6;
      }

      return {h: h, s: s, l: l};
    }
  }]
);

'use strict';

angular.module('designstudioApp')
  .controller('EditInstructionsCtrl', ['Instructions', '$analytics',
  function (Instructions, $analytics) {
    var me = this;

    me.text = Instructions.get();
    me.save = function() {
      Instructions.set(me.text);

      if (me.text.length > 0) {
        $analytics.eventTrack('added note', {category: 'design studio'});
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .service('Instructions', ['$uibModal', 'Design', function Instructions($uibModal, Design) {
    var me = this;
    var modalInstance;

    me.openModal = function openModal() {
      modalInstance = $uibModal.open({
        templateUrl: 'views/modal/instructions.html?ts='+Date.now(),
        controller: 'EditInstructionsCtrl',
        backdrop: 'static',
        keyboard: true,
        size: 'lg'
      });

      return modalInstance;
    };

    me.closeModal = function closeModal() {
      modalInstance.close();
      return modalInstance;
    };

    me.get = function() {
      return Design.data.instructions;
    };

    me.set = function(instructions) {
      Design.data.instructions = instructions.trim();
    };

    me.isSet = function() {
      var i =  me.get();

      return i && i.length > 0;
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .factory('Help', ['localStorageService', 'StudioMode', function (localStorageService, StudioMode) {
    var introJSOptions = {
      steps: [{
        element: '.main-menu-toolbar-row:first-child',
        intro: 'Use this to change your garment color or switch to another product',
        position: 'right'
      },
      {
        element: '.main-menu-toolbar-row:nth-child(2)',
        intro: 'Add your custom text and then style it using our 70+ fonts and design options',
        position: 'right'
      },
      {
        element: '.main-menu-toolbar-row:nth-child(3)',
        intro: 'Upload your own art file, or choose from over 10,000 pieces of clipart',
        position: 'right'
      },
      {
        element: '.main-menu-toolbar-row:nth-child(4)',
        intro: 'Used for team shirts when each player needs a custom name and/or number',
        position: 'right'
      },
      {
        element: '.main-menu-toolbar-row:nth-child(5)',
        intro: 'Save or Share your creation anytime',
        position: 'right'
      },
      {
        element: '#checkoutNowButton',
        intro: 'Quickly get a price and you can proceed to ordering your awesome apparel!',
        position: 'bottom'
      }],
      showStepNumbers: false,
      showBullets: false,
      nextLabel: 'Next',
      exitOnOverlayClick: true,
      exitOnEsc: true,
      keyboardNavigation: true
    };

    function shouldAutoStart() {
      return localStorageService.get('help.autoStart') !== '0';
    }

    function disableAutoStart() {
      localStorageService.set('help.autoStart', 0);
    }

    function getIntroOptions() {
      return introJSOptions;
    }

    return {
      getIntroOptions: getIntroOptions,
      shouldAutoStart: shouldAutoStart,
      disableAutoStart: disableAutoStart
    };
  }
]);

'use strict';

angular.module('designstudioApp')
  .service('Viewport', ['$document', '$window', function Viewport($document, $window) {
    var me = this;

    me.isExtraSmall = function () {
      return getWidth() < 768;
    };

    me.hasFloatingMenus = function () {
      return getWidth() > 999;
    };

    function getWidth() {
      return Math.max($document[0].documentElement.clientWidth, $window.innerWidth || 0);
    }
  }]
);

'use strict';

angular.module('designstudioApp')
  .factory('UploadObject', ['JSONService', 'config', 'InkColors', 'Color',
  function(JSONService, config, InkColors, Color) {
    var service = {
      changeToSingleColor: changeToSingleColor,
      changeToSingleColorLogo: changeToSingleColorLogo,
      changeToMultiColor: changeToMultiColor,
      changeToBlackAndWhite: changeToBlackAndWhite,
      changeToFullColor: changeToFullColor,
      changeSingleColor: changeSingleColor,
      toggleNegative: toggleNegative,
      toggleRemoveColor: toggleRemoveColor,
      hasAClipping: hasAClipping,
      isNegative: isNegative,
      isSingleColorLogo: isSingleColorLogo,
      getSingleColorLogoColor: getSingleColorLogoColor
    };

    return service;

    function changeToSingleColor(uploadObject, color) {
      uploadObject.details.multiColor = 0;
      uploadObject.details.clipping = 'ffffff';
      uploadObject.details.inkColors.length = 0;

      changeSingleColor(uploadObject, color);
    }

    function changeToSingleColorLogo(uploadObject, palette, color) {
      changeToMultiColor(uploadObject, 1);

      uploadObject.details.swappings = palette.filter(function (target) {
        return uploadObject.details.clippings.indexOf(target.hex.toLowerCase()) < 0;
      }).map(function (target) {
        return {target: target.hex.toLowerCase(), replacement: color.hex.toLowerCase()};
      });
    }

    function changeToMultiColor(uploadObject, colorCount) {
      uploadObject.details.multiColor = 1;
      uploadObject.details.clipping = 'ffffff';
      uploadObject.details.inkColors = InkColors.process.slice(0, colorCount);
    }

    function changeToFullColor(uploadObject) {
      var black = _.findWhere(InkColors.data, {name: 'Black'});

      uploadObject.details.multiColor = 2;
      uploadObject.details.clipping = 'ffffff';
      uploadObject.details.inkColors = InkColors.process.slice();
      uploadObject.details.inkColors.push(black);
    }

    function changeToBlackAndWhite(uploadObject) {
      var black = _.findWhere(InkColors.data, {name: 'Black'});
      var white = _.findWhere(InkColors.data, {name: 'White'});
      var gray = _.findWhere(InkColors.data, {name: 'Light Gray'});

      uploadObject.details.multiColor = 3;
      uploadObject.details.clipping = 'ffffff';
      uploadObject.details.inkColors = [black, white, gray];
    }

    function changeSingleColor(uploadObject, color) {
      uploadObject.details.inkColor = color;
      uploadObject.details.inkColorId = color.id;
    }

    function toggleNegative(uploadObject) {
      uploadObject.details.clipping = uploadObject.details.clipping === 'ffffff' ? '000000' : 'ffffff';
    }

    function toggleRemoveColor(uploadObject, hex) {
      var index = uploadObject.details.clippings.indexOf(hex);

      if (index >= 0) {
        uploadObject.details.clippings.splice(index, 1);
      } else {
        uploadObject.details.clippings.push(hex);
      }
    }

    function hasAClipping(uploadObject) {
      return uploadObject.details.clippings.length > 0;
    }

    function isNegative(uploadObject) {
      return uploadObject.details.clipping === '000000';
    }

    function isSingleColorLogo(uploadObject) {
      if (uploadObject.details.multiColor == 1) {
        return uploadObject.details.inkColors.length === 1;
      }

      return false;
    }

    function getSingleColorLogoColor(uploadObject) {
      var first = uploadObject.details.swappings.slice(0, 1).shift();

      return InkColors.data.filter(function (color) {
        return first.replacement.toLowerCase() === color.hex.toLowerCase();
      }).slice(0, 1).shift();
    }
  }
]);

'use strict';

angular.module('designstudioApp')
  .factory('PrintObjectPopover', ['$timeout', function ($timeout) {
    var visible = false;
    var triggered = false;
    var selectedElement = false;

    function show(element) {
      if (selectedElement) {
        return false;
      }

      selectedElement = element;

      if (triggered === false) {
        triggered = true;
        $timeout(function () {
          visible = true;
        }, 2000);

        $timeout(function () {
          visible = false;
        }, 12000);
      }
    }

    function hide() {
      visible = false;
    }

    function isVisible(element) {
      return visible && element === selectedElement;
    }

    return {
      show: show,
      hide: hide,
      isVisible: isVisible
    };
  }
]);

'use strict';

angular.module('designstudioApp')
  .directive('mainFooter', [function () {
    return {
      templateUrl: 'views/layout/main-footer.html?ts='+Date.now(),
      restrict: 'E',
      scope: false,
      replace: true
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('uploadObjectOrig', ['$timeout', '$q', 'UploadObject', 'UploadObjectImage', 'RenderQueue', function ($timeout, $q, UploadObject, UploadObjectImage, RenderQueue) {

    return {
      template: '<div></div>',
      restrict: 'E',
      replace: true,
      scope: false,
      link: function postLink(scope, element, attrs) {
        var reDrawTimeOutId = null;
        var useOrig = useOrigUpload();

        function onLoadOrig(element, previewImage, origImage) {
          var dims = UploadObjectImage.getDimensions(previewImage);
          var width = dims.width * scope.display.scale * scope.workspace.scale * Math.abs(scope.printObject.scaleX);
          var height = dims.height * scope.display.scale * scope.workspace.scale * Math.abs(scope.printObject.scaleY);

          var x = -width / 2 + (scope.printObject.x * scope.display.scale * scope.workspace.scale);
          var y = -height / 2 + (scope.printObject.y * scope.display.scale * scope.workspace.scale);

          if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
            RenderQueue.decrement();

            return false;
          }

          origImage.width = width;
          origImage.height = height;

          previewImage.width = width;
          previewImage.height = height;

          element.css({
            width: width,
            height: height
          });

          element.parents('.print-object').css({left: x + 'px', top: y + 'px'});

          element.css({
            transform: 'scale(' + scope.printObject.scaleX / Math.abs(scope.printObject.scaleX) + ', ' + scope.printObject.scaleY / Math.abs(scope.printObject.scaleY) + ')'
          });

          element.empty();

          if (useOrig) {
            element.append(origImage);
          } else {
            element.append(previewImage);
          }

          RenderQueue.decrement();
        }

        function renderOrig() {
          RenderQueue.increment();

          $q.all([
            UploadObjectImage.getPreviewImage(scope.printObject),
            UploadObjectImage.getOrigImage(scope.printObject)
          ]).then(function (images) {
            onLoadOrig(element, images[0], images[1]);
          });
        }

        function useOrigUpload() {
          var extWhiteList = ['jpg', 'jpeg', 'png', 'bmp', 'gif'];

          if (scope.printObject.details.uploadFile) {
            return extWhiteList.filter(function (ext) {
              return scope.printObject.details.uploadFile.origExt.replace('.', '') === ext;
            }).length > 0;
          }
        }

        scope.$watch('workspace.scale', function workspaceScaleWatch(newValue, oldValue) {
          if (newValue !== oldValue) {
            $timeout.cancel(reDrawTimeOutId);

            //A buffer for work space scaling to help with performance
            reDrawTimeOutId = $timeout(function(){
              renderOrig();
            }, 1);
          }
        });

        scope.$watch('printObject', function (newValue) {
          if (newValue) {
            renderOrig();
          }
        }, true);

      }
    };
  }]
);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').factory('Branding', [Service]);

  function Service() {
    //hard coded till the college.ink branch is merged
    var brand = {id: 1, name: 'rushordertees.com'};

    return brand;
  }
})(angular);

'use strict';

angular.module('designstudioApp')
  .service('YoutubeModal', ['$uibModal', '$rootScope', function YoutubeModal($uibModal, $rootScope) {
    var me = this;
    var modalInstance;

    me.openModal = function openModal(videoId) {
      var scope = $rootScope.$new();

      scope.videoId = videoId;

      modalInstance = $uibModal.open({
        templateUrl: 'views/modal/youtube.html?ts='+Date.now(),
        controller: 'YoutubeModalCtrl',
        backdrop: true,
        scope: scope,
        animation: false,
        windowClass: 'youtube-modal',
        backdropClass: 'youtube-modal-bd'
      });
    };

    me.closeModal = function closeModal() {
      modalInstance.close();
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .controller('YoutubeModalCtrl', ['$scope', '$sce', 'YoutubeModal',
  function ($scope, $sce, YoutubeModal) {
    $scope.close = YoutubeModal.closeModal;
    $scope.videoSrc = $sce.trustAsResourceUrl('//www.youtube.com/embed/' + $scope.videoId + '?autoplay=1&amp;wmode=transparent&amp;rel=0');
  }
]);

(function() {
  'use strict';

  angular.module('designstudioApp').controller('HeaderCtrl', [
    '$rootScope', 'Design', 'DesignItem', 'User', 'LoginModal', 'DesignsModal', 'SaveDesignModal', 'ShareModal', 'QuantitiesModal', 'DesignSave', 'CheckoutModal', 'MarinTracker', HeaderCtrl
  ]);

  function HeaderCtrl($rootScope, Design, DesignItem, User, LoginModal, DesignsModal, SaveDesignModal, ShareModal, QuantitiesModal, DesignSave, CheckoutModal, MarinTracker) {
    var me = this;

    me.isLoggedIn = User.isLoggedIn;
    me.getCartQuantity = User.getCartQuantity;
    me.openDesignsModal = DesignsModal.open;
    me.openQuantitiesModal = QuantitiesModal.open;
    me.getPrintMethodCode = Design.getPrintMethodCode;
    me.getQuantity = Design.getQuantity;

    me.methodPopover = {
      show: false,
      message: 'We do not offer embroidery on this product online.  We can assist you by phone with this at 1-800-620-1233.'
    };

    me.design = function () {
      $rootScope.$broadcast('resetMenu');
    };

    me.hasDesign = function () {
      return Design.data.designItems && (Design.isBlank() === false || Design.hasMinQuantity());
    };

    me.hasQuantity = function () {
      return Design.data.designItems && (Design.hasMinQuantity());
    };

    me.checkout = function () {
      if (Design.hasMinQuantity()) {
        CheckoutModal.open();
      } else {
        QuantitiesModal.open();
      }
    };

    me.openLoginModal = function () {
      LoginModal.open({
        onSuccess: function () {
          return DesignsModal.open;
        }
      });
    };

    me.openSaveModal = function () {
      SaveDesignModal.open({
        onSuccess: function () {
          return ShareModal.open;
        }
      });
    };

    me.trackCall = function () {
      MarinTracker.track((typeof Design.id != 'undefined') ? Design.id : null, 'phoneclick');
    }

    me.onPrintMethodToggle = function () {
      if (Design.data.designItems.length === 1 && hasBothMethods()) {
        Design.togglePrintMethod();
      } else {
        me.methodPopover.show = !me.methodPopover.show;
        if (me.getPrintMethodCode() === 'emb') {
          me.methodPopover.message = 'We do not offer screen printing on this product online.  We can assist you by phone with this at 1-800-620-1233.';
        } else {
          me.methodPopover.message = 'We do not offer embroidery on this product online.  We can assist you by phone with this at 1-800-620-1233.';
        }
      }
    }

    function hasBothMethods () {
      var pms = DesignItem.getPrintMethodsCodes();

      return pms.indexOf('emb') > -1 && pms.indexOf('scr') > -1;
    }
  }
})();

(function() {
  'use strict';

  angular.module('designstudioApp').controller('TutorialCtrl', ['YoutubeModal', TutorialCtrl]);

  function TutorialCtrl(YoutubeModal) {
    var me = this;

    me.openYotubeModal = YoutubeModal.openModal;
  }
})();

(function() {
  'use strict';

  angular.module('designstudioApp').controller('TemplatesCtrl', ['$window', 'Templates', '$analytics', TemplatesCtrl]);

  function TemplatesCtrl($window, Templates, $analytics) {
    var me = this;

    me.requestActive = true;
    me.mainCategory = false;
    me.subCategory = false;
    me.designs = [];
    me.mainCategories = [];
    me.subCategories = [];

    Templates.getCategories().then(function () {
      me.requestActive = false;
      me.mainCategories = Templates.mainCategories;
    });

    me.search = function (term) {
      me.requestActive = true;
      me.mainCategory = false;
      me.subCategory = {name: term};

      Templates.getDesigns(term).then(function () {
        me.requestActive = false;
        me.designs = Templates.designs;
      });
    };

    me.setMainCategory = function (category) {
      me.mainCategory = category;
      me.subCategories = Templates.getSubCategories(category.id);
    };

    me.setSubCategory = function (category) {
      me.requestActive = true;
      me.subCategory = category;

      Templates.getDesigns(category.term).then(function () {
        me.requestActive = false;
        me.designs = Templates.designs;
      });
    };

    me.load = function (template) {
      $analytics.eventTrack('changed template', {category: 'design studio', label: template.name});

      $window.location = $window.location.pathname + '#/?design=' + $window.btoa(template.id);
      $window.location.reload();
    };
  }
})();

'use strict';

angular.module('designstudioApp')
  .directive('menuTutorial', [function () {
    return {
      templateUrl: 'views/menu/tutorial.html?ts='+Date.now(),
      restrict: 'E',
      scope: true,
      controller: 'TutorialCtrl',
      controllerAs: 'tutorial',
      replace: true
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('menuInstructions', [function () {
    return {
      templateUrl: 'views/menu/instructions.html?ts='+Date.now(),
      restrict: 'E',
      scope: true,
      controller: 'EditInstructionsCtrl',
      controllerAs: 'instructions',
      replace: true
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('menuTemplates', [function () {
    return {
      templateUrl: 'views/menu/templates.html?ts='+Date.now(),
      restrict: 'E',
      scope: true,
      controller: 'TemplatesCtrl',
      controllerAs: 'templates',
      replace: true
    };
  }]
);

(function() {
  'use strict';

  angular.module('designstudioApp').factory('Templates', ['Branding', 'APIService', Templates]);

  function Templates(Branding, APIService) {
    var allCategories = [];

    var service = {
      designs: [],
      mainCategories: [],
      getCategories: getCategories,
      getSubCategories: getSubCategories,
      getDesigns: getDesigns
    };

    return service;

    function getCategories() {
      return APIService.getDesignCategoriesByBranding(Branding.name).success(onComplete);

      function onComplete(data) {
        allCategories = data;

        service.mainCategories = _.filter(data, function (cat) {
          return !cat.designideacategory_id;
        });
      }
    }

    function getSubCategories(categoryId) {
      return _.filter(allCategories, function (cat) {
        return cat.designideacategory_id == categoryId;
      });
    }

    function getDesigns(term) {
      return APIService.designIdeaSearch(term).success(onComplete);

      function onComplete(data) {
        service.designs = data.records;
      }
    }
  }
})();

(function() {
  'use strict';

  angular.module('designstudioApp').factory('LoginModal', ['$uibModal', LoginModal]);

  function LoginModal($uibModal) {
    var modalInstance;
    var service = {
      open: openModal,
      close: closeModal
    };

    return service;

    function openModal(resolve) {
      modalInstance = $uibModal.open({
        templateUrl: 'views/modal/login.html?ts='+Date.now(),
        controller: 'LoginCtrl',
        controllerAs: 'loginMenu',
        keyboard: true,
        backdrop: true,
        size: 'sm',
        resolve: resolve
      });
    }

    function closeModal() {
      modalInstance.close();
    }
  }
})();

(function() {
  'use strict';

  angular.module('designstudioApp').factory('DesignsModal', ['$uibModal', DesignsModal]);

  function DesignsModal($uibModal) {
    var modalInstance;
    var service = {
      open: openModal,
      close: closeModal
    };

    return service;

    function openModal() {
      modalInstance = $uibModal.open({
        templateUrl: 'views/modal/designs.html?ts='+Date.now(),
        controller: 'DesignsCtrl',
        keyboard: true,
        backdrop: true,
        windowClass: 'designs-modal',
        size: 'md'
      });
    }

    function closeModal() {
      modalInstance.close();
    }
  }
})();

(function() {
  'use strict';

  angular.module('designstudioApp').factory('ShareModal', ['$uibModal', ShareModal]);

  function ShareModal($uibModal) {
    var modalInstance;
    var service = {
      open: openModal,
      close: closeModal
    };

    return service;

    function openModal() {
      modalInstance = $uibModal.open({
        templateUrl: 'views/modal/share.html?ts='+Date.now(),
        controller: 'ShareDesignCtrl',
        keyboard: true,
        backdrop: true,
        size: 'sm'
      });
    }

    function closeModal() {
      modalInstance.close();
    }
  }
})();

(function() {
  'use strict';

  angular.module('designstudioApp').factory('SaveDesignModal', ['$uibModal', 'Design', SaveDesignModal]);

  function SaveDesignModal($uibModal, Design) {
    var modalInstance;
    var customMessage = null;

    var service = {
      open: openModal,
      close: closeModal,
      getCustomMsg: getCustomMsg
    };

    return service;

    function openModal(resolve) {
      modalInstance = $uibModal.open({
        templateUrl: 'views/modal/saveDesign.html?ts='+Date.now(),
        controller: 'SaveDesignCtrl',
        keyboard: true,
        backdrop: true,
        size: 'sm',
        resolve: resolve
      });

      Design.deleteEmptyTextObjects();
    }

    function closeModal() {
      customMessage = null;
      modalInstance.close();
    }

    function getCustomMsg() {
      return customMessage;
    }
  }
})();

'use strict';

angular.module('designstudioApp')
  .controller('SaveDesignCtrl', ['$scope', 'DesignSave', 'User', 'Design', 'SaveDesignModal', 'onSuccess', '$analytics', 'IP', 'OrderWarnModal', function ($scope, DesignSave, User, Design, SaveDesignModal, onSuccess, $analytics, IP, OrderWarnModal) {
    var savedName, existingData = DesignSave.getExistingData();
    var saveConfig = {};

    var onSaveSuccess = function () {
      SaveDesignModal.close();
      onSuccess();
    };

    var onSaveFailure = function () {
      SaveDesignModal.close();
    };

    $scope.saveMenu = {
      menu: false,
      submitted: false,
      requestActive: false,
      currentSession: DesignSave.isExistingSession(),
      crudAction: 'update'
    };

    $scope.saveMenu.getCustomMsg = SaveDesignModal.getCustomMsg;
    $scope.saveMenu.close = SaveDesignModal.close;
    $scope.saveMenu.isCorporateIP = IP.isCorporate();
    $scope.saveMenu.blockSaveEmail = IP.isCorporate();

    $scope.saveMenu.submit = function (data) {
      if (DesignSave.isExistingSession() && $scope.saveDesignForm.$valid) {
        $scope.saveMenu.overwrite(data);
      } else {
        $scope.saveMenu.save(data);
      }
    };

    $scope.saveMenu.overwrite = function (data) {
      saveConfig.blockSaveEmail = $scope.saveMenu.blockSaveEmail;
      $scope.saveMenu.menu = 'isSaving';
      $scope.saveMenu.requestActive = true;

      DesignSave.setData(data);
      DesignSave.save(saveConfig).then(onSaveSuccess, onSaveFailure);

      $analytics.eventTrack('save options modal - overwrote design', {category: 'design studio'});
    };

    $scope.saveMenu.save = function (data) {
      $scope.saveMenu.submitted = true;
      saveConfig.blockSaveEmail = $scope.saveMenu.blockSaveEmail;

      if ($scope.saveDesignForm.$valid === false) {
        return false;
      }

      $scope.saveMenu.requestActive = true;

      DesignSave.checkIfExisting(data).then(function (isExisting) {
        if (isExisting === true) {
          DesignSave.hasActiveOrder(data).then(function (hasActiveOrder) {
            if (hasActiveOrder && $scope.saveMenu.isCorporateIP === false) {
              OrderWarnModal.open();
              $scope.saveMenu.menu = 'saveOptions';
              $scope.saveMenu.requestActive = false;
              $scope.saveMenu.menu = false;
            } else {
              $scope.saveMenu.menu = 'saveOptions';
              $scope.saveMenu.requestActive = false;
              $scope.saveMenu.crudAction = 'update';
            }
          });
        } else {
          if ($scope.saveMenu.menu === 'saveOptions') {
            $analytics.eventTrack('save options modal - new design', {category: 'design studio'});
          }

          $scope.saveMenu.menu = 'isSaving';
          DesignSave.setData(data);
          DesignSave.save(saveConfig).then(onSaveSuccess, onSaveFailure);
        }
      });
    };

    $scope.saveMenu.crudChange = function (crudAction) {
      if (crudAction === 'create') {
        savedName = $scope.saveMenu.data.name;
        $scope.saveMenu.data.name = '';
      } else {
        $scope.saveMenu.data.name = savedName;
      }
    };

    if (DesignSave.isExistingSession()) {
      $scope.saveMenu.menu = 'saveOptions';

      $analytics.eventTrack('save options modal - load', {category: 'design studio'});
    } else if(User.isLoggedIn() && existingData.name) {
      $scope.saveMenu.menu = 'preCheck';
      $scope.saveMenu.requestActive = true;

      DesignSave.checkIfExisting(existingData).then(function (isExisting) {
        if (isExisting) {
          DesignSave.hasActiveOrder(existingData).then(function (hasActiveOrder) {
            $scope.saveMenu.requestActive = false;

            if (hasActiveOrder && $scope.saveMenu.isCorporateIP === false) {
              OrderWarnModal.open();
              $scope.saveMenu.menu = false;
            } else {
              Design.setEmail(existingData.email);
              $scope.saveMenu.menu = 'saveOptions';
            }

            $analytics.eventTrack('save options modal - load', {category: 'design studio'});
          });
        } else {
          $scope.saveMenu.requestActive = false;
          $scope.saveMenu.menu = false;

          $analytics.eventTrack('add to cart', {category: 'EnhancedEcommerce'});
        }
      });

    } else if (existingData.name.length === 0) {
      existingData.name = DesignSave.getDefaultName();

      $analytics.eventTrack('add to cart', {category: 'EnhancedEcommerce'});
    }

    $scope.saveMenu.data = existingData;
  }]
);

(function() {
  'use strict';

  angular.module('designstudioApp').factory('QuantitiesModal', ['$uibModal', 'Design', QuantitiesModal]);

  function QuantitiesModal($uibModal, Design) {
    var modalInstance;

    var service = {
      open: openModal,
      close: closeModal
    };

    return service;

    function openModal(resolve) {
      resolve = resolve ? resolve : {onSuccess: angular.noop};

      modalInstance = $uibModal.open({
        templateUrl: 'views/modal/quantities.html?ts='+Date.now(),
        controller: 'QuantitiesCtrl',
        controllerAs: 'quantities',
        keyboard: true,
        backdrop: true,
        windowClass: 'quantities-modal',
        resolve: resolve
      });

      Design.deleteEmptyTextObjects();
    }

    function closeModal() {
      modalInstance.close();
    }
  }
})();

(function(angular) {
  'use strict';

  angular.module('designstudioApp').controller('QuantitiesCtrl', ['Design', 'DesignItem', 'QuantitiesModal', 'CheckoutModal', 'DesignSave', 'Vinyl', 'onSuccess', '$uibModal', 'dialogs', 'AutoItemSwitch', 'Catalog', QuantitiesCtrl]);

  function QuantitiesCtrl(Design, DesignItem, QuantitiesModal, CheckoutModal, DesignSave, Vinyl, onSuccess, $uibModal, dialogs, AutoItemSwitch, Catalog) {
    var me = this;
    var hasHighQuantity = false;
    var maxAutoSwitchQuantity = 5;

    me.activeRequest = false;
    me.designItems = Design.data.designItems;
    me.getProductItemUrl = DesignItem.getProductItemUrl;

    me.close = QuantitiesModal.close;
    me.getMinQuantity = Design.getMinQuantity;
    me.openSizeChart = DesignItem.openSizeChart;

    me.highQuantity = function(){
      if(Design.getQuantity() > 74){
         hasHighQuantity = true;
      }
      return(hasHighQuantity && waitTime());
    }

    function waitTime() {

      var d = new Date();
      var dst = checkDST(d);
      var hours = (dst) ? d.getUTCHours() - 4 : d.getUTCHours() - 5;
      var day = (hours < 0) ? d.getUTCDay() - 1: d.getUTCDay();
      hours = (hours < 0) ? 24 - hours : hours;
      var minutes = d.getMinutes()/60;
      var weekdayHours = (hours + minutes >= 8.5 && hours + minutes <= 20) ? true : false;
      var weekendHours = (hours + minutes >= 10 && hours + minutes <= 16.5) ? true : false;
      if(((day === 0 || day === 6) && weekendHours) || ((day !== 0 && day !== 6) && weekdayHours)){
        return true;
      } else {
        return false;
      }
    }

    function checkDST(d) {
      if(d.getUTCMonth() >= 2 && d.getUTCMonth() <= 10){
        if(d.getUTCMonth() === 2) {
          return (d.getUTCDate() - d.getUTCDay() >= 8)
        } else if(d.getUTCMonth() === 10){
          return(d.getUTCDate() - d.getUTCDay() <= 0)
        } else {
          return true;
        }
      } else {
        return false;
      }
    }

    me.hasVinyl = function () {
      return Design.hasVinyl(Design.data);
    };

    me.hasSizeChart = function (style, sizeType) {
      return DesignItem.hasSizeChart(style);
    };

    me.removeColor = function (designItem, color) {
      var dlg = dialogs.confirm('Are You Sure?', 'Are you sure you want to remove the color ' + color.name + '?', {
        size: 'md'
      });

      dlg.result.then(function() {
        DesignItem.removeColorFromItem(designItem, color);

        if (designItem.colors.length === 0) {
          Design.removeItem(designItem);
        }
      });
    };

    me.openNamesListModal = function () {
      me.close();
      Vinyl.openModal();
    };

    me.checkout = function () {
      if (Design.hasMinQuantity() === true) {
        me.form.$setValidity('quantity', true);
      } else {
        return me.form.$setValidity('quantity', false);
      }

      me.activeRequest = true;

      if (canCheckAutoItem()) {
        AutoItemSwitch.getProduct(DesignItem.item).then(onAutoItem);
      } else if (Design.isLowVolume()) {
        Design.hasNonLowVolumeProduct().then(onLowVolumeProduct);
      } else {
        success();
      }
    };

    function canCheckAutoItem() {
      return AutoItemSwitch.wasAlreadySwitched(DesignItem.item.style) === false && Design.hasPreviousOrder() !== true && Design.isEmbroidery() === false && Design.getQuantity() <= maxAutoSwitchQuantity && Design.isBlank() === false;
    }

    function onAutoItem(autoItem) {
      var originalDesignItem;

      if (!autoItem && Design.isLowVolume()) {
        return Design.hasNonLowVolumeProduct().then(onLowVolumeProduct);
      } else if (!autoItem) {
        return success();
      }

      Catalog.getItemById(DesignItem.item.catalogItemId).then(function (originalItem) {
        Design.getLowVolumeProducts().then(function (products) {
          originalItem.isLowVolume = products.some(function (product) {
            return product.style.toLowerCase() === originalItem.style.toLowerCase();
          });

          AutoItemSwitch.addToSwitched(DesignItem.item.style);
          Design.changeNewItem(autoItem);
          success(autoItem, originalItem);
        });
      });
    }

    function onLowVolumeProduct(isInvalid) {
      var dlg;

      if (isInvalid) {
        dlg = dialogs.confirm('Change Product or Increase Quantity',
          "The selected product(s) have a " + Design.getLowVolumeQuantity() + " piece minimum. Do you want to change to a product without a minimum?", {
          size: 'md'
        });

        dlg.result.then(function () {
          QuantitiesModal.close();

          $uibModal.open({
            templateUrl: 'views/modal/low-volume.html?ts='+Date.now(),
            controller: 'LowVolumeModalCtrl',
            controllerAs: 'modal',
            keyboard: false,
            backdrop: 'static',
            size: 'lg',
            windowClass: 'low-volume-modal',
            resolve: {
              onSuccess: function () {
                return onSuccess;
              }
            }
          });
        }, function () {
          me.activeRequest = false;
        });
      } else {
        success();
      }
    }

    function success(autoItem, originalItem) {
      QuantitiesModal.close();

      if (onSuccess) {
        onSuccess();
      } else {
        CheckoutModal.open({
          autoItem: autoItem,
          originalItem: originalItem
        });
      }
    }
  }
})(angular);

(function() {
  'use strict';

  angular.module('designstudioApp').controller('CheckoutCtrl', ['$rootScope', 'Design', 'DesignItem', 'PrintArea', 'Pricing', 'CheckoutModal', 'QuantitiesModal', 'SaveDesignModal', 'DesignSave', 'Promo', '$uibModal', 'data', CheckoutCtrl]);

  function CheckoutCtrl($rootScope, Design, DesignItem, PrintArea, Pricing, CheckoutModal, QuantitiesModal, SaveDesignModal, DesignSave, Promo, $uibModal, data) {
    var me = this;

    me.quote = false;
    me.activeRequest = false;
    me.showTerms = needsTerms();
    me.showTermsWarning = false;
    me.approvedTerms = !me.showTerms;

    if (angular.isObject(data)) {
      me.autoItem = data.autoItem;
      me.originalItem = data.originalItem;
    }

    me.minQuantity = Design.getLowVolumeQuantity();

    me.designItems = Design.data.designItems;
    me.getQuantity = DesignItem.getQuantity;
    me.printAreas = Design.data.printAreas;
    me.countInkColors = PrintArea.countInkColors;
    me.getProductItemUrl = DesignItem.getProductItemUrl;
    me.close = CheckoutModal.close;

    Pricing.getFullQuote(Design.data).then(function (data) {
      me.quote = data;

      Promo.getExisting().then(function (promoData) {
        if (promoData) {
          Promo.checkPromo(data.total, data.quantity, Design.data.designItems, promoData).then(function (promo) {
            if (promo) {
              me.promoData = promo;
              me.promoString = Promo.parse(promo);
              me.quote.total -= promo.discount;
            }
          });
        }
      });
    });

    me.updateSizes = function () {
      QuantitiesModal.open();
      CheckoutModal.close();
    };

    me.addToCart = function () {
      me.activeRequest = true;

      if (DesignSave.isExistingSession() && DesignSave.isClean()) {
        DesignSave.buyNow();
      } else {
        CheckoutModal.close();
        SaveDesignModal.open({
          onSuccess: function () {
            return DesignSave.checkout;
          }
        });
      }
    };

    me.addNewItem = function () {
      CheckoutModal.close();
      $uibModal.open({
        templateUrl: 'views/modal/add-product.html?ts='+Date.now(),
        controller: 'AddProductModalCtrl',
        controllerAs: 'modal',
        keyboard: true,
        backdrop: true,
        size: 'lg',
        windowClass: 'add-product-modal',
        resolve: {
          onSuccess: function () {
            return CheckoutModal.open;
          }
        }
      });
    };

    me.canAddNewItem = function () {
      return Design.isEmbroidery() === false;
    };

    me.addColor = function (item) {
      var designItem = Design.data.designItems.filter(function (designItem) {
        return designItem.catalogItemId == item.id;
      }).shift();

      DesignItem.switchItemColor(designItem);

      CheckoutModal.close();
      $uibModal.open({
        templateUrl: 'views/modal/add-color.html?ts='+Date.now(),
        controller: 'AddColorModalCtrl',
        controllerAs: 'modal',
        keyboard: true,
        backdrop: true,
        size: 'lg',
        windowClass: 'add-color-modal',
        resolve: {
          onSuccess: function () {
            return CheckoutModal.open;
          },
          selectedProduct: function () {
            return designItem;
          }
        }
      });
    };

    me.revertAutoSwitch = function () {
      Design.changeNewItem(me.originalItem);
      CheckoutModal.close();
      CheckoutModal.open();
    };

    me.revertAndEditSizes = function () {
      Design.changeNewItem(me.originalItem);
      me.updateSizes();
    };

    me.openLowVolume = function () {
      CheckoutModal.close();

      $uibModal.open({
        templateUrl: 'views/modal/low-volume.html?ts='+Date.now(),
        controller: 'LowVolumeModalCtrl',
        controllerAs: 'modal',
        keyboard: false,
        backdrop: 'static',
        size: 'lg',
        windowClass: 'low-volume-modal',
        resolve: {
          onSuccess: function () {
            return CheckoutModal.open;
          }
        }
      });
    }

    me.checkTerms = function () {
      if (me.approvedTerms) {
        me.showTermsWarning = false;

        return true;
      }

      me.showTermsWarning = true;
    };

    function needsTerms() {
      if (Design.getQuantity() > 5) {
        return false;
      }

      return Design.hasAtleastOneUpload();
    }
  }
})();

(function() {
  'use strict';

  angular.module('designstudioApp').controller('ReminderCtrl', ['ReminderModal', ReminderCtrl]);

  function ReminderCtrl(ReminderModal) {
    var me = this;

    me.email = '';
    me.error = false;
    me.submitted = false;

    me.close = ReminderModal.close;
    me.submit = function submit(email) {
      me.error = false;
      me.submitted = true;

      if (me.form.$valid === false) {
        return false;
      }

      ReminderModal.send(me.email);
      ReminderModal.close();
    };
  }
})();

(function() {
  'use strict';

  angular.module('designstudioApp').factory('ReminderModal', ['$q', '$uibModal', 'Design', 'User', 'StudioMode', 'Branding', 'APIService', ReminderModal]);

  function ReminderModal($q, $uibModal, Design, User, StudioMode, Branding, APIService) {
    var modalInstance;
    var service = {
      open: openModal,
      close: closeModal,
      send: reminderEmail
    };

    return service;

    function openModal() {
      modalInstance = $uibModal.open({
        templateUrl: 'views/modal/reminder.html?ts='+Date.now(),
        controller: 'ReminderCtrl',
        controllerAs: 'reminder',
        keyboard: true,
        backdrop: false,
        animation: false,
        windowClass: 'reminder-modal'
      });
    }

    function closeModal() {
      modalInstance.close();
    }

    function reminderEmail(email) {
      return APIService.reminderEmail({
        'email': email,
        'branding': Branding.name,
        "event" : "MobileDesignStudioReminder"
      }).then(onEmail, onEmail);

      function onEmail() {
        if (User.isLoggedIn() === false) {
          return User.login(email)
        } else {
          return $q.when(true);
        }
      }
    }
  }
})();

(function() {
  'use strict';

  angular.module('designstudioApp').controller('PromoModalCtrl', ['PromoModal', 'promoData', PromoModalCtrl]);

  function PromoModalCtrl(PromoModal, promoData) {
    var me = this;

    me.email = '';
    me.name = promoData.name;

    me.submitted = false;
    me.requestActive = false;

    me.close = PromoModal.close;

    me.submit = function submit(email) {
      me.submitted = true;

      if (me.form.$valid === false) {
        return false;
      }

      me.requestActive = true;

      PromoModal.apply(promoData.code, email).then(PromoModal.close);
    };
  }
})();

(function() {
  'use strict';

  angular.module('designstudioApp').factory('PromoModal', ['$q', '$uibModal', 'Promo', 'StudioMode', 'User', 'JSONService', PromoModal]);

  function PromoModal($q, $uibModal, Promo, StudioMode, User, JSONService) {
    var modalInstance;
    var service = {
      open: openModal,
      close: closeModal,
      apply: applyPromo
    };

    return service;

    function openModal(code) {
      modalInstance = $uibModal.open({
        templateUrl: 'views/modal/promo.html?ts='+Date.now(),
        controller: 'PromoModalCtrl',
        controllerAs: 'promo',
        keyboard: true,
        backdrop: true,
        windowClass: 'promo-modal',
        backdropClass: 'promo-modal-backdrop',
        resolve: {
          promoData: function() {
            return Promo.read(code).then(function (promoData) {
              return Promo.apply(code).then(function () {
                return promoData;
              })
            });
          }
        }
      });
    }

    function closeModal() {
      modalInstance.close();
    }

    function applyPromo(code, email) {
      return Promo.apply(code).then(onPromo, onPromo);

      function onPromo() {
        if (User.isLoggedIn() === false) {
          return User.login(email);
        } else {
          return true;
        }
      }
    }
  }
})();

'use strict';

angular.module('designstudioApp')
  .directive('menuLanding', [ function () {
    return {
      templateUrl: 'views/menu/landing.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: false
    };
  }]
);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').controller('AddProductModalCtrl', ['$uibModalInstance', 'Design', 'DesignItem', 'Catalog', 'config', 'onSuccess', AddProductModalCtrl]);

  function AddProductModalCtrl($uibModalInstance, Design, DesignItem, Catalog, config, onSuccess) {
    var me = this;

    me.selectedProduct = null;
    me.selectedColor = null;
    me.isLoadingProduct = false;
    me.isLoadingProducts = true;

    me.selectProduct = selectProduct;
    me.selectColor = selectColor;
    me.save = save;
    me.dismiss = $uibModalInstance.dismiss;
    me.getProductItemUrl = DesignItem.getProductItemUrl;
    me.getProductImageUrl = DesignItem.getProductImageUrl;

    Catalog.getItemCompatibles().then(function (products) {
      me.products = products.filter(function (product) {
        return !Design.data.designItems.some(function (designItem) {
          return parseInt(designItem.catalogItemId, 10) == parseInt(product.id, 10);
        });
      }).map(function (product) {
        product.style = product.style.toLowerCase();

        return product;
      });

      me.isLoadingProducts = false;
    });

    function selectProduct(productId) {
      me.isLoadingProduct = true;

      Catalog.getItemById(productId).then(function (product) {
        var existingColor =_.findWhere(product.availableColors, {'name': DesignItem.color.name});

        me.selectedProduct = product;
        me.selectedColor = existingColor ? existingColor : product.availableColors[0];
        me.isLoadingProduct = false;
      });
    }

    function selectColor(color) {
      me.selectedColor = color;
    }

    function save() {
      Design.addNewItem(me.selectedProduct, me.selectedColor);
      $uibModalInstance.close();
      onSuccess();
    }
  }
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').controller('EditProductItemCtrl', [
    '$scope', 'Design', 'DesignItem', 'dialogs', 'QuantitiesModal', '$analytics', 'MainMenu', 'Pricing', 'StudioMode',EditProductItemCtrl
  ]);

  function EditProductItemCtrl($scope, Design, DesignItem, dialogs, QuantitiesModal, $analytics, MainMenu, Pricing, StudioMode) {
    var me = this;
    var quote;

    me.showDetails = false;
    me.colorOnHover = false;
    me.pricePerPiece = 0;

    me.getNameOfInt = getNameOfInt;
    me.getArticleOfInt = getArticleOfInt;
    me.getPrice = getPrice;
    me.changeItem = changeItem;
    me.switchItemColor = switchItemColor;
    me.setColor = setColor;
    me.canChangeToColor = canChangeToColor;
    me.editSizes = editSizes;
    me.canDelete = canDelete;
    me.toggleDetails = toggleDetails;
    me.isActiveColor = isActiveColor;
    me.isActiveColorId = isActiveColorId;
    me.removeColorFromItem = removeColorFromItem;
    me.onEnterColor = onEnterColor;
    me.onLeaveColor = onLeaveColor;
    me.hasDetails = hasDetails;
    me.hasSizeChart = hasSizeChart;

    me.getProductItemUrl = DesignItem.getProductItemUrl;
    me.openSizeChart = DesignItem.openSizeChart;
    me.getQuantity = DesignItem.getQuantity;

    $scope.design = Design.data;
    $scope.$watch('design', function (newValue) {
      if (Design.hasMinQuantity() === false) {
        return;
      }

      Pricing.getFullQuote(Design.data).then(function (response) {
        quote = response;
      });
    }, true);

    function getNameOfInt(n) {
      var special = ['zeroth','first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelvth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth'];
      var deca = ['twent', 'thirt', 'fourt', 'fift', 'sixt', 'sevent', 'eight', 'ninet'];

      if (n < 20) {
        return special[n];
      }

      if (n % 10 === 0) {
        return deca[Math.floor(n / 10)-2] + 'ieth';
      }

      return deca[Math.floor(n / 10) - 2] + 'y-' + special[n % 10];
    }

    function getArticleOfInt(n) {
      var vowels = ['a', 'e', 'i', 'o', 'u'];
      var letter = getNameOfInt(n).slice(0, 1).toLowerCase();

      return vowels.indexOf(letter) === -1 ? 'a' : 'an';
    }

    function getPrice(itemId, colorId) {
      return Pricing.getItemColorPrice(quote, itemId, colorId);
    }

    function changeItem(designItem) {
      DesignItem.switchItemColor(designItem);
      MainMenu.setActive('catalog');
    }

    function switchItemColor(designItem, color, $event) {
      $event.preventDefault();
      me.onItemSelect({designItem: designItem, color: color});
    }

    function setColor(color) {
      DesignItem.setColor(color);
      $analytics.eventTrack('product change - color', {category: 'design studio', label: color.name});
    }

    function canChangeToColor(color) {
      if (DesignItem.color.id == color.id) {
        return true;
      } else {
        return !DesignItem.hasColor(color);
      }
    }

    function onEnterColor(color) {
      me.colorOnHover = color;
    }

    function onLeaveColor() {
      me.colorOnHover = false;
    }

    function hasDetails(designItem) {
      return designItem.description.length > 0;
    }

    function hasSizeChart(style) {
      return StudioMode.isCheckout() && DesignItem.hasSizeChart(style);
    }

    function editSizes(color) {
      DesignItem.switchColor(color);
      QuantitiesModal.open();

      $analytics.eventTrack('product change - unit number/size change', {category: 'design studio'});
    }

    function canDelete(designItem, color) {
      return isActiveColor(designItem, color) && (Design.data.designItems.length > 1 || designItem.colors.length > 1);
    }

    function toggleDetails() {
      me.showDetails = !me.showDetails;
    }

    function isActiveColor(designItem, color) {
      return DesignItem.item === designItem && DesignItem.color === color;
    }

    function isActiveColorId(designItem, colorId) {
      return DesignItem.item === designItem && DesignItem.color.id === colorId;
    }

    function removeColorFromItem(designItem, color) {
      var dlg = dialogs.confirm('Are You Sure?', 'Are you sure you want to remove the color ' + color.name + '?', {
        size: 'md'
      });

      dlg.result.then(function () {
        DesignItem.removeColorFromItem(designItem, color);

        if (designItem.colors.length === 0) {
          Design.removeItem(designItem);
        }
      });
    }
  }
})(angular);

'use strict';

angular.module('designstudioApp')
  .controller('AddTextObjectCtrl', ['$scope', 'Design', 'Clipart', 'PrintArea', 'PrintObject', 'InkColors', 'display', 'MainMenu',
  function ($scope, Design, Clipart, PrintArea, PrintObject, InkColors, display, MainMenu) {
    $scope.newTextDetails = '';

    $scope.addTextObject = function (text) {
      var dupe;
      var template;
      var textobject;
      var lastTextObject;
      var lastInkColor;

      if (text.length === 0) {
        return false;
      }

      lastTextObject = _.last(_.filter(PrintArea.data.printObjects, function (print) {
        return print.type === 'textobject';
      }));

      if (lastTextObject && Design.isPrintObjectOutOfContainment(lastTextObject)) {
        lastTextObject = false;
      }

      if (lastTextObject && lastTextObject.details.text.length > 0) {
        lastTextObject = angular.copy(lastTextObject);
        lastTextObject.details.text = text;
        lastInkColor = PrintArea.getLastSingleInkColorUsed();

        if (angular.isDefined(lastInkColor)) {
          lastTextObject.details.inkColor = lastInkColor;
        }

        dupe = PrintObject.duplicatePrintObject(lastTextObject, lastTextObject.y + 10, PrintArea.getNewZIndex());

        PrintArea.printObjectAdd(PrintArea.data.printObjects, dupe);
        PrintObject.set(dupe, true);
      } else {
        template = PrintArea.getPrintObjectTemplate();
        template.text = text;

        textobject = PrintObject.createTextObject(template);
        PrintArea.printObjectAdd(PrintArea.data.printObjects, textobject);
        PrintObject.set(textobject, true);
      }

      MainMenu.setActive(false);
    };

    $scope.switchToGreek = function () {
      Clipart.newMode = true;
      Clipart.searchTerm = 'greek';
      $scope.setActive('addArt');
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('menuAddText', [function () {
    return {
      templateUrl: 'views/menu/addText.html?ts='+Date.now(),
      restrict: 'E',
      replace: true,
      scope: false,
      link: function postLink(scope, element, attrs) {
      }
    };
  }]
);

'use strict';

angular.module('designstudioApp')
  .directive('buttonFixedClose', [function () {
    return {
      scope: {},
      restrict: 'E',
      replace: true,
      template: [
        '<button type="button" class="close btn-fixed-close" aria-label="Close"><span aria-hidden="true">&times;</span></button>'
      ].join(''),
      link: function postLink(scope, element, attrs) {
      }
    };
  }]
);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').factory('BulkPricing', ['Pricing', 'APIService', BulkPricing]);

  function BulkPricing(Pricing, APIService) {
    var service = {
      getRecommendations: getRecommendations,
      getSplitColors: getSplitColorsBulkFullQuote
    };

    return service;

    function getRecommendations(design, items, printMethodCode) {
      var requests = [];
      var quoteRequest = Pricing.createQuoteRequest(design);
      var simpleItems = items.map(flattenSimpleItem);
      var flatItems = quoteRequest.items.map(flattenDesignItem);
      var totalQuantity = flatItems.map(function (item) {
        return item.colors.map(function (color) {
          return color.quantity;
        }).reduce(add);
      }).reduce(add);

      quoteRequest.printAreas.forEach(function (pa) {
        pa.printMethod = printMethodCode;
      });

      requests = simpleItems.map(function (item) {
        var newRequest = {
          items: [],
          printAreas: quoteRequest.printAreas,
          vinyl: quoteRequest.vinyl
        };

        var items = angular.copy(flatItems);
        var changed = items.slice(0, 1).shift();

        changed.style = item.style;
        changed.catalogItemId = item.catalogItemId;
        changed.colors = changed.colors.map(function (color) {
          var newColor = getColorToQuote(item.colors, color.name);

          newColor.quantity = color.quantity;

          return newColor;
        });

        if (totalQuantity === 0) {
          changed.colors.slice(0, 1).shift().quantity = 20;
        }

        newRequest.items = items.map(expandItem);

        return newRequest;
      });
      // requests = [].concat.apply([], requests);
      return APIService.getQuote(requests).then(function(response) {
        response.forEach(function (quote) {
          var quoteItem = quote.items.slice().shift();
          var matchingItem = items.filter(function (item) {
            return quoteItem && item.id === quoteItem.id;
          }).shift();

          if (matchingItem) {
            matchingItem.color = quoteItem.colors.slice().shift();
            matchingItem.perPiece = parseFloat(quote.perPiece);
            matchingItem.quantity = parseInt(quote.quantity, 10);
            matchingItem.example = totalQuantity === 0;
          }
        });

        return items;
      });
    }

    function getSplitColorsBulkFullQuote(design, items, printMethodCode) {
      var requests = [];
      var quoteRequest = Pricing.createQuoteRequest(design);
      var simpleItems = items.map(flattenSimpleItem);
      var flatItems = quoteRequest.items.map(flattenDesignItem);
      var totalQuantity = flatItems.map(function (item) {
        return item.colors.map(function (color) {
          return color.quantity;
        }).reduce(add);
      }).reduce(add);

      quoteRequest.printAreas.forEach(function (pa) {
        pa.printMethod = printMethodCode;
      });

      requests = simpleItems.map(function (item) {
        var newRequest = {
          items: [],
          printAreas: quoteRequest.printAreas,
          vinyl: quoteRequest.vinyl
        };

        var items = angular.copy(flatItems);
        var changed = items.slice(0, 1).shift();

        changed.catalogItemId = item.catalogItemId;
        changed.colors = changed.colors.map(function (color) {
          var newColor = getColorToQuote(item.colors, color.name);

          newColor.quantity = color.quantity;

          return newColor;
        });

        if (totalQuantity === 0) {
          changed.colors.slice(0, 1).shift().quantity = 50;
        }

        newRequest.items = items.map(expandItem);

        return splitQuote(item, newRequest);
      });

      requests = [].concat.apply([], requests);

      return APIService.getQuote(requests).then(function(response){
          var quotes = response.data;
          quotes.forEach(function (quote) {
          var quoteItem = quote.items.slice().shift();
          var isWhite = quoteItem.colors.some(isColorWhite);
          var matchingItem = items.filter(function (item) {
            return item.id === quoteItem.id;
          }).shift();

          if (isWhite) {
            matchingItem.whitePrice = parseFloat(quote.perPiece);
          } else {
            matchingItem.colorPrice = parseFloat(quote.perPiece);
          }
          return matchingItem;
        });

        return items;
      });
    }

    function splitQuote(simpleItem, request) {
      var colorToReplace;
      var newRequest = angular.copy(request);
      var itemToChange = newRequest.items.slice(0, 1).shift();
      var hasWhite = itemToChange.colors.some(isColorWhite);
      var newColor = simpleItem.colors.filter(function (color) {
        return !itemToChange.colors.some(function (itemColor) {
          return itemColor.name.toLowerCase() === color.name.toLowerCase();
        });
      }).shift();

      if (angular.isUndefined(newColor)) {
        newColor = simpleItem.colors.slice(0, 1).shift();
      }

      if (hasWhite) {
        colorToReplace = itemToChange.colors.filter(isColorWhite).shift();
      } else {
        colorToReplace = itemToChange.colors.slice().shift();
      }

      colorToReplace.id = newColor.id;
      colorToReplace.name = newColor.name;
      colorToReplace.sizes.slice().shift().sizes.slice().shift().catalogItemSizeId = newColor.catalogItemSizeId;

      return [request, newRequest];
    }

    function getColorToQuote(colors, existingColorName) {
      var newColor = colors.filter(function (itemColor) {
        return itemColor.name.toLowerCase() === existingColorName.toLowerCase();
      }).shift();

      if (angular.isUndefined(newColor)) {
        newColor = colors.filter(function (itemColor) {
          return !isColorWhite(itemColor)
        }).shift();
      }

      if (angular.isUndefined(newColor)) {
        newColor = colors.slice().shift();
      }

      return angular.copy(newColor);
    }

    function expandItem(item) {
      var expanded = {
        style: item.style,
        catalogItemId: item.catalogItemId
      };

      expanded.colors = item.colors.map(function (color) {
        return {
          id: color.id,
          code: color.code,
          name: color.name,
          sizes: [{
            style: item.style,
            catalogItemId: item.catalogItemId,
            sizes: [{
              sizeCode: color.sizeCode,
              quantity: color.quantity,
              catalogItemSizeId: color.catalogItemSizeId
            }]
          }]
        };
      });

      return expanded;
    }

    function flattenSimpleItem(item) {
      var colors = item.colors.filter(function (color) {
        return color.sizes && color.sizes.length > 0;
      }).map(function (color) {
        var size = color.sizes.slice().shift();

        return {
          id: color.id,
          code: color.code,
          name: color.name,
          sizeCode: size.code,
          catalogItemSizeId: size.id
        };
      });

      return {
        style: item.style,
        catalogItemId: item.id,
        colors: colors
      };
    }

    function flattenDesignItem(item) {
      var colors = item.colors.map(function (color) {
        var quantity = color.sizes.map(function (sizeType) {
          return sizeType.sizes.map(function (size) {
            return parseInt(size.quantity, 10);
          }).reduce(add);
        }).reduce(add);

        return {
          id: color.id,
          name: color.name,
          code: color.code,
          quantity: quantity,
          catalogItemSizeId: color.sizes.filter(function (sizeType) {
            return sizeType.catalogItemId == item.catalogItemId;
          }).shift().sizes.slice().shift().catalogItemSizeId
        };
      });

      return {
        style: item.style,
        catalogItemId: item.catalogItemId,
        colors: colors
      };
    }

    function add(a, b) {
      return a + b;
    }

    function isColorWhite(color) {
      return color.name.toLowerCase() === 'white';
    }
  }
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').controller('AskQuantityDialogCtrl',
    ['$scope', '$document', '$uibModalInstance', 'data', 'CatalogItemComparable', 'Design', AskQuantityDialogCtrl]
  );

  function AskQuantityDialogCtrl($scope, $document, $uibModalInstance, data, CatalogItemComparable, Design) {
    var itemId = data.itemId;
    var colorId = data.colorId;
    var lowQuantityItemId = CatalogItemComparable.getLowQtyItemId();
    var lowQuantityColorId = CatalogItemComparable.getLowQtyColorId();
    $scope.lowQuantityLabel = CatalogItemComparable.getLowQtyLabel();
    $scope.mediumQuantityLabel = CatalogItemComparable.getMediumQtyLabel();
    $scope.highQuantityLabel = CatalogItemComparable.getHighQtyLabel();

    $scope.lowQuantity = function() {
      $document[0].title = $document[0].title + ' - ' + $scope.lowQuantityLabel + ' Pieces';
      lowQuantityItemId =  (lowQuantityItemId !== null) ? lowQuantityItemId : itemId;
      lowQuantityColorId = (lowQuantityColorId !== null) ? lowQuantityColorId : colorId;
      $uibModalInstance.close({itemId:lowQuantityItemId, colorId:lowQuantityColorId});
    };

    $scope.medQuantity = function(){
      $document[0].title = $document[0].title + ' - ' + $scope.mediumQuantityLabel + ' Pieces';
      $uibModalInstance.close({itemId:itemId, colorId:colorId});
    };

    $scope.highQuantity = function(){
      $document[0].title = $document[0].title + ' - ' + $scope.highQuantityLabel + ' Pieces';
      $uibModalInstance.close({itemId:itemId, colorId:colorId});
    };

    $scope.close = function(){
      $uibModalInstance.close({itemId:itemId, colorId:colorId});
    };
  }

})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').controller('AddColorModalCtrl', ['$modalInstance', 'DesignItem', 'selectedProduct', 'onSuccess', AddColorModalCtrl]);

  function AddColorModalCtrl($modalInstance, DesignItem, selectedProduct, onSuccess) {
    var me = this;

    me.selectedProduct = selectedProduct;
    me.selectedColor = false;
    me.colorOnHover = {};

    me.hasColorForAdd = DesignItem.hasColor;
    me.colorOnEnter = colorOnEnter;
    me.colorOnLeave = colorOnLeave;
    me.selectColor = selectColor;
    me.save = save;
    me.dismiss = $modalInstance.dismiss;
    me.getProductItemUrl = DesignItem.getProductItemUrl;
    me.getProductImageUrl = DesignItem.getProductImageUrl;

    function colorOnEnter(color) {
      me.colorOnHover = color;
    }

    function colorOnLeave() {
      me.colorOnHover = {};
    }

    function selectColor(color) {
      me.selectedColor = color;
    }

    function save() {
      DesignItem.addColor(me.selectedColor);
      $modalInstance.close();
      onSuccess();
    }
  }
})(angular);

(function() {
  'use strict';

  angular.module('designstudioApp').directive('printAreaGuide', ['display', printAreaGuide]);

  function printAreaGuide(display) {
    var directive = {
      templateUrl: 'views/workspace/printAreaGuide.html',
      restrict: 'E',
      scope: {
        guide: '=',
        scale: '=',
        showLabel: '=',
        lightLabel: '='
      },
      replace: true,
      link: link,
      controller: ['$scope', '$element', '$attrs', controller]
    };

    return directive;

    function link(scope, element, attrs) {
      var lineStyle = scope.guide.lineStyle ? scope.guide.lineStyle : 'default';

      element.addClass(lineStyle);
      render();

      scope.$watch('scale', render);

      function render() {
        element.css({
          top: scope.guide.y * display.scale * scope.scale,
          left: scope.guide.x * display.scale * scope.scale,
          width: scope.guide.width * display.scale * scope.scale,
          height: scope.guide.height * display.scale * scope.scale
        });
      }
    }

    function controller($scope, $element, $attrs) {

    }
  }
})();

(function(angular) {
  'use strict';

  angular.module('designstudioApp').controller('LowVolumeModalCtrl',
    ['Design', 'DesignItem', 'Catalog', 'QuantitiesModal', 'CheckoutModal', '$uibModalInstance', 'onSuccess', 'config', LowVolumeModalCtrl]
  );

  function LowVolumeModalCtrl(Design, DesignItem, Catalog, QuantitiesModal, CheckoutModal, $uibModalInstance, onSuccess, config) {
    var me = this;
    var blacklist = ['363', '3001c', 'g200', 'g500'];

    me.products = [];
    me.selectedProduct = null;
    me.selectedColor = null;
    me.isLoadingProduct = false;
    me.isLoadingProducts = true;

    me.selectProduct = selectProduct;
    me.selectColor = selectColor;
    me.getProductItemUrl = getProductItemUrl;
    me.save = save;
    me.cancel = cancel;

    me.dismiss = $uibModalInstance.dismiss;
    me.getProductImageUrl = DesignItem.getProductImageUrl;
    me.getMinQuantity = Design.getMinQuantity;

    Design.getLowVolumeProducts().then(onProductsLoad);

    function onProductsLoad(products) {
      me.isLoadingProducts = false;
      me.products = products.filter(function (product) {
        return blacklist.includes(product.style.toLowerCase()) === false;
      });
    }

    function selectProduct(productId) {
      me.isLoadingProduct = true;

      Catalog.getItemById(productId).then(function (product) {
        var existingColor =_.findWhere(product.availableColors, {'name': DesignItem.color.name});

        product.availableColors = product.availableColors.map(function (color) {
          DesignItem.filterCompanionSizes(product.catalogItemId, color);

          return color;
        });

        me.selectedProduct = product;
        me.selectedColor = existingColor ? existingColor : product.availableColors[0];
        me.isLoadingProduct = false;
      });
    }

    function selectColor(color) {
      me.selectedColor = color;
    }

    function getProductItemUrl(style) {
      return config.catalogURL + '/productpng/' + style.toLowerCase() + '.png';
    }

    function cancel() {
      $uibModalInstance.dismiss();
      QuantitiesModal.open(onSuccess);
    }

    function save() {
      var min = Design.getMinQuantity();
      var quantity = DesignItem.getQuantity(me.selectedColor.sizes);

      if (quantity < min) {
        return me.form.$setValidity('quantity', false);
      } else {
        me.form.$setValidity('quantity', true);
      }

      Design.data.designItems.length = 0;
      Design.addNewItem(me.selectedProduct, me.selectedColor);
      $uibModalInstance.close();
      CheckoutModal.open();
    }
  }
})(angular);

(function(angular) {
  'use strict';
  angular.module('designstudioApp').service('IP', [Service]);

  function Service() {
    var isCorporate = false;
    var service = {
      etl: etl,
      isCorporate: isCorporateIP
    };

    return service;

    function etl(configData) {
      isCorporate = configData.isCorporateIP;
    }

    function isCorporateIP() {
      return isCorporate;
    }
  }
})(angular);

(function() {
  'use strict';

  angular.module('designstudioApp').factory('Promo', ['$q', 'User', 'DesignItem', 'JSONService', 'APIService', Promo]);

  function Promo($q, User, DesignItem, JSONService, APIService) {
    var modalInstance;
    var service = {
      read: readPromo,
      apply: applyPromo,
      getExisting: getExistingPromo,
      parse: parsePromo,
      checkPromo: checkPromo
    };

    return service;

    function readPromo(code) {
      var defer = $q.defer();

      APIService.getPromoByCode(code).then(function (response) {
        if (angular.isDefined(response.data.code)) {
          defer.resolve(response.data);
        } else {
          defer.reject('invalid');
        }
      });

      return defer.promise;
    }

    function applyPromo(code) {
      return User.setCartPromo(code);
    }

    function getExistingPromo() {
      var promo;

      if (User.hasCartPromo()) {
        promo = User.getCartPromo();

        return readPromo(promo.code);
      }

      return $q.when(false);
    }

    function parsePromo(promo) {
      if (promo.freeQuantity) {
        return 'Will be applied in checkout';
      } else {
        return '-' + parseFloat(promo.discount).toFixed(2);
      }
    }

    function checkPromo(subTotal, quantity, designItems, code) {
      var items = [];

      designItems.forEach(function (designItem) {
        designItem.colors.forEach(function (color) {
          items.push({
            catalogItemId: designItem.catalogItemId,
            quantity: DesignItem.getQuantity(color.sizes)
          });
        });
      });

      return APIService.getValidPromoCodes(subTotal, quantity, items, [code]).then(function (data) {
        return data.shift();
      });
    }
  }
})();

(function() {
  'use strict';

  angular.module('designstudioApp').factory('UploadPalette', ['$q', '$window', 'config', 'UploadObject', 'Color', 'JSONService', 'AWSService', UploadPalette]);

  function UploadPalette($q, $window, config, UploadObject, Color, JSONService, AWSService) {
    var service = {
      getPaletteFromUpload: getPaletteFromUpload,
      removeColor: removeColor,
      swapColor: swapColor,
      mergeSwappings: mergeSwappings,
      hasPaletteSupport: hasPaletteSupport
    };

    return service;

    function getPaletteFromImage(image) {
      var canvas = getCanvasFromImage(image);

      return generatePaletteFromCanvas(canvas);
    }

    function getPaletteFromUpload(printObject) {
      var fileName = printObject.details.uploadFile.fileName + '.png';

      return AWSService.mergeSimilarColors(fileName).then(function (data) {
        data.forEach(function (rgb) {
          rgb.hex = Color.rgb2hex(rgb.r, rgb.g, rgb.b);
        });

        return data;
      });
    }

    function getCanvasFromImage(image) {
      var dims = UploadObject.getDimensions(image, 100);
      var canvas = angular.element('<canvas></canvas>')[0];
      var context = canvas.getContext('2d');

      canvas.width = dims.width;
      canvas.height = dims.height;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      return canvas;
    }

    function generatePaletteFromCanvas(canvas) {
      var deferred = $q.defer();
      var worker = new Worker('workers/mergeColors.js');
      var context = canvas.getContext('2d');
      var bitmap = context.getImageData(0, 0, canvas.width, canvas.height);

      worker.onmessage = function(e) {
        var palette = e.data.palette;

        worker.terminate();
        palette.forEach(function (rgb) {
          rgb.hex = Color.rgb2hex(rgb.r, rgb.g, rgb.b);
        });

        deferred.resolve(palette);
      };

      worker.addEventListener('error', deferred.reject, false);
      worker.postMessage({minDelta: 17, maxPaletteSize: 10, minPercentage: 1, bitmap: bitmap.data, useBit: 'Uint8ClampedArray' in $window});

      return deferred.promise;
    }

    function swapColor(canvas, colors, palette) {
      var imageData;
      var deferred = $q.defer();
      var worker = new Worker('workers/swapColor.js');
      var context = canvas.getContext('2d');
      var promise = deferred.promise;

      promise.worker = worker;
      imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      if (colors.length === 0) {
        deferred.resolve(canvas);

        return deferred.promise;
      } else {
        colors = colors.map(function (color) {
          var rgb = {
            target: Color.hex2rgb(color.target),
            replacement: Color.hex2rgb(color.replacement)
          };

          return rgb;
        });
      }

      worker.onmessage = function(e) {
        worker.terminate();
        context.putImageData(e.data.imageData, 0, 0);
        deferred.resolve(canvas);
      };

      worker.addEventListener('error', deferred.reject, false);
      worker.postMessage({palette: palette, colors: colors, imageData: imageData});

      return promise;
    }

    function removeColor(image, colors, palette) {
      // console.time('removeColor');
      var imageData;
      var deferred = $q.defer();
      var worker = new Worker('workers/removeColor.js');
      var canvas = angular.element('<canvas></canvas>')[0];
      var context = canvas.getContext('2d');
      var promise = deferred.promise;

      promise.worker = worker;
      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0, image.width, image.height);
      imageData = context.getImageData(0, 0, image.width, image.height);

      if (colors.length === 0) {
        deferred.resolve(canvas);
        // console.timeEnd('removeColor');

        return deferred.promise;
      } else {
        colors = colors.map(function (color) {
          return Color.hex2rgb(color);
        });
      }

      worker.onmessage = function(e) {
        worker.terminate();
        context.putImageData(e.data.imageData, 0, 0);
        deferred.resolve(canvas);
        // console.timeEnd('removeColor');
      };

      worker.addEventListener('error', deferred.reject, false);
      worker.postMessage({palette: palette, colors: colors, imageData: imageData});

      return promise;
    }

    function mergeSwappings(colors, palette) {
      return colors.map(function (color) {
        var rgb = Color.hex2rgb(color.target);
        var target = getClosestRGB(rgb, palette);

        color.target = Color.rgb2hex(target.r, target.g, target.b);

        return color;
      });
    }

    function getClosestRGB(rgb, palette) {
      var lab1 = Colordiff.rgb2Lab({
        r: rgb.r,
        g: rgb.g,
        b: rgb.b
      });

      return palette.map(function (possible) {
        possible.delta = Colordiff.compare(possible.lab, lab1);

        return possible;
      }).sort(function (a, b) {
        return a.delta - b.delta;
      }).shift();
    }

    function hasPaletteSupport() {
      return 'Worker' in $window;
    }
  }
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').directive('popoverShow', ['$timeout', popoverShow]);

  function popoverShow($timeout) {
    var directive = {
      restrict: 'A',
      scope: {
        popoverShow: '='
      },
      link: link
    };

    return directive;

    function link(scope, element, attrs) {
      var triggered = false;

      scope.$watch('popoverShow', function (value) {
        if (value && triggered === false) {
          triggered = true;
          $timeout(function() {
            element.trigger('show');
          }, 0);
        } else if(triggered === true && value === false) {
          triggered = false;
          $timeout(function() {
            element.trigger('hide');
          }, 0);
        }
      });
    }
  }
})(angular);

(function(angular, _) {
  'use strict';

  angular.module('designstudioApp').directive('menuCatalog', ['$compile', 'Design', 'Viewport', menuCatalog]);

  function menuCatalog($compile, Design, Viewport) {
    var directive = {
      scope: {},
      link: link,
      restrict: 'E',
      replace: true,
      controller: ['$scope', '$animate', '$element', 'config', 'MainMenu', 'Catalog', 'Design', 'DesignItem', 'dialogs', '$analytics', 'Viewport', 'BulkPricing', 'StudioMode', controller],
      templateUrl: 'views/menu/catalog/catalog.html?ts=' + Date.now(),
    };

    return directive;

    function link(scope, element, attrs) {
      scope.selectItem = selectItem;
      scope.setFilters = setFilters;

      function setFilters(facetTitle, facetOption, $event){
        angular.element('.product-menu-item-quickview').remove();
        scope.toggleFacetFilter(facetTitle, facetOption);
      }

      scope.$on('$destroy', function () {
        element.parents('.main-menu').removeClass('full-width');
      });

      function selectItem(item, $event) {
        if (Design.isExistingItem(item.id)) {
          return false;
        }

        if (Viewport.isExtraSmall()) {
          scope.changeItem(item.id);
          return false;
        }

        var qv = angular.element('.product-menu-item-quickview');
        var target = angular.element($event.currentTarget);
        var index = target.index('.product-menu-item');
        var parent = target.parent();
        var items = parent.children('.product-menu-item');
        var itemsPerRow = Math.min(Math.floor(parent.width() / target.outerWidth()), items.length);
        var distance = itemsPerRow - (index % itemsPerRow) - 1;
        var qvScope = scope.$new(true);

        distance = Math.min(distance, items.length - index - 1);

        qvScope.item = item;
        qvScope.target = target;
        qvScope.changeItem = scope.changeItem;

        if (qv.length) {
          qv.scope().$destroy();
          qv.remove();
        }

        qv = $compile('<catalog-quick-view item="item" target="target" on-select="changeItem(itemId, colorId);"></catalog-quick-view>')(qvScope);
        qv.insertAfter(items.get(index + distance));
      }
    }

    function controller($scope, $animate, $element, config, MainMenu, Catalog, Design, DesignItem, dialogs, $analytics, Viewport, BulkPricing, StudioMode) {
      var quotedItems = [];
      var possibleItems = [];
      var availableItems = [];
      var currentFilter = '';

      $scope.term = '';
      $scope.facets = {};
      $scope.items = [];
      $scope.categories = [];
      $scope.enableFilters = true;
      $scope.requestActive = true;
      $scope.sortBy = '-priority';
      $scope.isExtraSmall = Viewport.isExtraSmall();
      $scope.quantity = Design.getQuantity();
      $scope.printMethods = ['Screen Printing', 'Embroidery', 'No Minimum'];
      $scope.printMethod = $scope.printMethods[0];
      $scope.filters = []; //$scope.isExtraSmall ? [] : ['printMethods:' + $scope.printMethod];
      $scope.facetNames = [{
        name: 'categories',
        show: true,
        displayName: 'Categories'
      }, {
        name: 'brand',
        displayName: 'Brand'
      }, {
        name: 'unisexSizes',
        displayName: 'Unisex Sizes'
      }, {
        name: 'womanSizes',
        displayName: 'Woman Sizes'
      }, {
        name: 'youthSizes',
        displayName: 'Youth Sizes'
      }];

      $scope.$ctrl = {
        selectedCategory: 'default'
      };
      $scope.activeSubcategory = '';
      $scope.activeCategory = '';
      $scope.filterTitles = ['materials', 'decoration', 'fit', 'brand', 'manufacturing', 'minimum quantity'];
      $scope.facetOptions = [];
      $scope.productDisplay = false;
      $scope.isFilterMenu = true;
      $scope.hasProducts = false;

      $scope.close = close;
      $scope.hasFilter = hasFilter;
      $scope.toggleFilter = toggleFilter;
      $scope.changeMethod = changeMethod;
      $scope.changeItem = changeItem;
      $scope.getCategoryFacets = getCategoryFacets;
      $scope.updateCategoryFilter = updateCategoryFilter;
      $scope.clearCategories = clearCategories;
      $scope.loadMore = loadMore;
      $scope.onSortChange = onSortChange;
      $scope.isProductDisplay = isProductDisplay;
      $scope.toggleFacetFilter = toggleFacetFilter;
      $scope.setFilterOptions = setFilterOptions;
      $scope.isActiveCategory = isActiveCategory;
      $scope.toggleCategory = toggleCategory;
      $scope.hasFacetFilters = hasFacetFilters;
      $scope.checkFilterOption = checkFilterOption;
      $scope.getCategoryImageUrl = getCategoryImageUrl;
      $scope.toggleSideCategory = toggleSideCategory;
      $scope.goBackCategory = goBackCategory;
      $scope.previousFilter = previousFilter;
      $scope.filterSet = filterSet;

      $scope.setActive = MainMenu.setActive;
      $scope.isExistingItem = Design.isExistingItem;
      $scope.getProductItemUrl = DesignItem.getProductItemUrl;

      $animate.addClass(angular.element('#catalogMenu').parents('.main-menu'), 'full-width').then(activate);

      function activate() {
        Catalog.searchCategories().then(function (response) {
          $scope.hasProducts = true;
          $scope.productDisplay = false;
          var topLevelCategories = [];
          for(var i = 0; i < response.hits.length; i++){
            if (response.hits[i].parentCategory === null && topLevelCategories.indexOf(response.hits[i]) === -1){
              topLevelCategories.push(response.hits[i])
            }
          }
          onCategorySearch(topLevelCategories);
          $scope.requestActive = false;
          $scope.facets = response.facets;
          $scope.categories = topLevelCategories;
        });
      }

      function close() {
        MainMenu.setActive('editProduct');
      }

      function hasFilter(filter) {
        return $scope.filters.indexOf('catalogCategories:'+filter) > -1 || $scope.filters.indexOf('parentCategory:'+filter) > -1;
      }

      function getCategoryFacets() {
        if ($scope.filters.length === 0) {
          return $scope.categories;
        } else if (angular.isArray($scope.facets.categories)) {
          return $scope.facets.categories.filter(function (filter) {
            return !hasFilter(filter);
          });
        } else {
          return $scope.categories;
        }
      }

      function previousFilter() {
        if($scope.activeCategory === '') {
          return "";
        } else if($scope.activeSubcategory === ''){
          return $scope.activeCategory;
        } else {
          return $scope.activeSubcategory;
        }
        /*return $scope.filters.map(function (filter) {
          return filter.split(':').pop();
        });*/
      }

      function updateCategoryFilter(selectedCategory) {
        if (selectedCategory === 'default') {
          return false;
        }
        for(var i = 0; i < $scope.categories.length; i++){
          if(selectedCategory === $scope.categories[i].name){
            if($scope.activeCategory){
              toggleFilter($scope.categories[i]);
            } else {
              toggleSideCategory($scope.categories[i].name.toLowerCase());
            }
          }
        }
      }

      function clearCategories() {
        $scope.filters = [];
        $scope.activeSubcategory = '';
        $scope.activeCategory = '';
        $scope.requestActive = true;
        activate();
      }

      function toggleFilter(filter, event) {
        if(event){
          event.stopPropagation();
        }
        $scope.requestActive = true;
        $scope.items = [];
        $scope.$ctrl.selectedCategory = 'default';

        $scope.activeSubcategory = filter.name;
        $scope.filters = [];
        $scope.productDisplay = true;
        if(filter.url.includes('jerseys')){
          flipFilter('catalogCategories:jerseys');
        } else {
          var filterParts = filter.url.split('/');
          for(var i = 0; i < filterParts.length; i++){
            if(filterParts[i].includes('-') && filterParts[i] !== 'v-neck' && filterParts[i] !== 't-shirts'){
              var cleanFilterPart = filterParts[i].replace(/-/g, ' ');
              flipFilter('catalogCategories:'+cleanFilterPart);
            } else {
              flipFilter('catalogCategories:'+filterParts[i]);
            }
          }
        }
        if(filter.name.includes("Embroidered")){
          flipFilter('printMethods:Embroidery')
        }

        Catalog.search($scope.term, $scope.filters).then(onSearch);
      }

      function toggleSideCategory(category){
        $scope.productDisplay = false;
        $scope.requestActive = true;
        $scope.activeCategory = category;
        $scope.$ctrl.selectedCategory = 'default';
        $scope.filters = [];

        flipFilter('parentCategory:'+category);
        Catalog.searchCategories(['parentCategory:'+category]).then(function(response){
          onCategorySearch(response.hits);
        })
      }

      function toggleCategory(category){
        if($scope.isExtraSmall){
          updateCategoryFilter(category.name)
        } else {
          if(!$scope.activeCategory){
            $scope.activeCategory = category.name;
          } else {
            $scope.activeSubCategory = category.name;
          }
          $scope.requestActive = true;
          $scope.filters = [];
          if(category.parentCategory !== null){
            if(category.url.includes('jerseys')){
              flipFilter('catalogCategories:jerseys')
            } else {
              var urlParts = category.url.split('/');
              for(var i = 0; i < urlParts.length; i++){
                if(urlParts[i].includes("-") && urlParts[i] !== 't-shirts' && urlParts[i] !== 'v-neck'){
                  var cleanUrl = urlParts[i].replace(/-/g, ' ')
                  flipFilter('catalogCategories:'+cleanUrl)
                } else {
                  flipFilter('catalogCategories:'+urlParts[i])
                }
              }
            }

            if(category.parentCategory.includes('Embroidery')){
              flipFilter('printMethods:Embroidery')
            }
            Catalog.search($scope.term, $scope.filters).then(onSearch);
          } else {
            Catalog.searchCategories(['parentCategory:'+category.name]).then(function(response){
              onCategorySearch(response.hits);
            })
          }
        }
      }

      function changeMethod(method) {
        if (hasFilter('printMethods:' + method)) {
          return false;
        }

        flipFilter('printMethods:' + $scope.printMethod);
        flipFilter('printMethods:' + method);
        $scope.printMethod = method;
        $scope.requestActive = true;
        Catalog.search($scope.term, $scope.filters).then(onSearch);
      }

      function onCategorySearch(hits){
        $scope.hasProducts = true;
        var sortedHits = sortCategoryHits(hits);
        $scope.subCategories = sortedHits
        if($scope.isExtraSmall) {
          $scope.categories = sortedHits
        }
        $scope.requestActive = false;
      }

      function sortCategoryHits(hits){
        return hits.sort(compareHits);
      }

      function compareHits(a, b){
        return a.id - b.id;
      }

      function changeItem(itemId, colorId) {
        if (Design.isExistingItem(itemId)) {
          return false;
        }

        $scope.requestActive = true;

        Catalog.getItemById(itemId).then(function (catalogItem) {
          $scope.requestActive = false;

          checkMethods();

          function checkMethods() {
            var dlg;
            var missingPMs = Design.getIncompatibleItems(catalogItem);

            if (missingPMs.length) {
              dlg = dialogs.confirm('Are You Sure?', Catalog.getIncompatibleMethodsMsg(missingPMs, catalogItem), {
                size: 'md'
              });

              dlg.result.then(checkColors);
            } else {
              checkColors();
            }
          }

          function checkColors() {
            var dlg, missingColors;
            var shouldAsk = Catalog.shouldAskToDeleteColors(DesignItem.item, catalogItem);

            if (shouldAsk) {
              missingColors = Catalog.getMissingColors(DesignItem.item, catalogItem);
              dlg = dialogs.confirm('Are You Sure?', Catalog.getIncompatibleColorsMsg(missingColors, catalogItem, DesignItem.item), {
                size: 'md'
              });

              dlg.result.then(replaceItem);
            } else {
              replaceItem();
            }
          }

          function replaceItem() {
            var color;

            Design.changeNewItem(catalogItem);

            if (colorId) {
              color = catalogItem.availableColors.find(function (color) {
                return parseInt(color.id, 10) === parseInt(colorId, 10);
              });

              if (color) {
                DesignItem.setColor(color);
              }
            }

            $analytics.eventTrack('product change - type', {category: 'design studio', label: catalogItem.style});
            MainMenu.setActive('editProduct');
          }
        });
      }

      function flipFilter(filter) {
        var index = $scope.filters.indexOf(filter);
        cleanFilter(filter);
        if (index === -1) {
          $scope.filters.push(filter);
        } else {
          $scope.filters.splice(index, 1);
        }
      }

      function cleanFilter(filter){
        if((filter.includes('catalogCategories') && $scope.filters.includes('parentCategory')) || (filter.includes('parentCategory') && $scope.filters.includes('catalogCategories'))){
          $scope.filters = [];
        }
      }

      function onSortChange(sortBy) {
        $scope.sortBy = sortBy;

        possibleItems = availableItems.slice().sort(function (a, b) {
          return sortItems(a, b, $scope.sortBy);
        });

        $scope.items = [];
        loadMore($element.height(), $element.width());
      }

      function onSearch(response) {
        if(response.hits.length === 0){
          $scope.hasProducts = false;
        } else {
          $scope.hasProducts = true;
        }
        availableItems = response.hits;
        possibleItems = availableItems.slice().sort(function (a, b) {
          return sortItems(a, b, $scope.sortBy);
        });
        setFilterOptions(response.facets);
        $scope.items = possibleItems;

        $scope.facets = response.facets;
        $scope.requestActive = false;
        $scope.productDisplay = true;
      }

      function setFilterOptions(facets){
        var facetKeys = Object.keys(facets);
        var facetOptions = [];
        for(var i = 0; i < facetKeys.length; i++){
          if($scope.filterTitles.indexOf(facetKeys[i]) !== -1){
            var filterOptions = facets[facetKeys[i]].map(function(a){
              return a.name;
            })
            facetOptions[facetKeys[i]] = filterOptions;
          }
        }
        $scope.facetOptions = facetOptions;

      }

      function loadMore(menuHeight, menuWidth) {
        var numberToLoad, newItems;
        var needQuote = [];
        var minWidth = 230;
        var minHeight = 400;
        var printMethod = $scope.printMethod === 'Embroidery' ? 'emb' : 'scr';

        menuWidth = parseInt(menuWidth, 10) - 200;
        menuHeight = parseInt(menuHeight, 10) - 75;
        menuWidth = Math.max(menuWidth, minWidth);
        menuHeight = Math.max(menuHeight, minHeight);

        numberToLoad = Math.floor(menuWidth / 230) * (Math.round(menuHeight / 400) + 1);
        numberToLoad = Math.max(numberToLoad, 2);
        newItems = possibleItems.splice(0, numberToLoad);

        $scope.items = _.union($scope.items, newItems);
      }

      function setPricing(items, printMethod) {
        var needQuote = [];

        items.forEach(setPrices);

        needQuote = items.filter(function (item) {
          return !quotedItems.some(function (quoted) {
            return quoted.id == item.id
          });
        });

        if (needQuote.length === 0) {
          return false;
        }

        BulkPricing.getSplitColors(Design.data, angular.copy(needQuote), printMethod).then(function (itemsWithPrices) {
          itemsWithPrices.forEach(function (item) {
            quotedItems.push(item);
          });

          items.forEach(setPrices);
        });

        function setPrices(item) {
          var match = quotedItems.filter(function (quoted) {
            return quoted.id == item.id;
          }).shift();

          if (angular.isDefined(match)) {
            item.whitePrice = match.whitePrice;
            item.colorPrice = match.colorPrice;
          }
        }
      }

      function sortItems(a, b, sortBy) {
        var key, direction, splits = sortBy.split('-');

        if (splits.length > 1) {
          direction = splits[0];
          key = splits[1];
        } else {
          direction = '+';
          key = splits[0];
        }

        if (direction === '+') {
          return a[key] - b[key];
        } else {
          return b[key] - a[key];
        }
      }

      function toggleFacetFilter(facet, filter){
        $scope.requestActive = true;
        checkFilterOption(facet, filter);
        Catalog.search($scope.term, $scope.filters).then(onSearch)
      }

      function checkFilterOption(facet, filter){
        var searchTerm = facet+':'+filter;
        var filterIndex = $scope.filters.indexOf(searchTerm);
        if(filterIndex === -1){
          $scope.filters.push(searchTerm);
        } else {
          $scope.filters.splice(filterIndex, 1);
        }
      }

      function isActiveCategory(filter){
        return (filter === $scope.activeCategory)
      }

      function hasFacetFilters(filter){
        return (filter !== undefined);
      }

      function isProductDisplay(){
        return ($scope.productDisplay);
      }

      function getCategoryImageUrl(name){
        if(!$scope.activeCategory){
          return config.catalogURL + '/category_labels/'+name.toLowerCase()+'.jpg';
        } else {
          if(name.includes('/')){
            name = 'dress';
          }
          return config.catalogURL + '/category_pics/'+$scope.activeCategory.toLowerCase()+'_'+name.toLowerCase()+'.jpg';
        }

      }

      function goBackCategory(filter){
        $scope.items = [];
        if(filter === $scope.activeSubcategory){
          $scope.activeSubcategory = '';
          $scope.filters = [];
          toggleSideCategory($scope.activeCategory);
        } else if ($scope.isExtraSmall){
          clearCategories();
        } else {
          $scope.filters = [];
          toggleSideCategory(filter);
        }
      }

      function filterSet(filterTitle, filterOption) {
        return ($scope.filters.indexOf(filterTitle + ':' + filterOption) !== -1)
      }
    }
  }
})(angular, _);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').directive('catalogQuickView', ['$window', catalogQuickView]);

  function catalogQuickView($window) {
    var directive = {
      scope: {
        item: '=',
        target: '=',
        onSelect: '&'
      },
      link: link,
      restrict: 'E',
      replace: true,
      controller: ['$scope', 'DesignItem', controller],
      templateUrl: 'views/menu/catalog/quickview.html?ts=' + Date.now(),
    };

    return directive;

    function link(scope, element, attrs) {
      var parent = element.parents('#catalogMenu').first();
      var parentHeight = parent.height();

      scope.close = close;

      parent.animate({
        scrollTop: element.position().top - (parentHeight / 3)
      });

      $window.requestAnimationFrame(function () {
        element.css('opacity', 1);
      });

      function close() {
        scope.$destroy();
        element.parents('.main-menu-panels').animate({scrollTop: scope.target.position().top});
        element.remove();
      }
    }

    function controller($scope, DesignItem) {
      $scope.submitted = false;
      $scope.selectedColor = false;
      $scope.colorOnHover = false;
      $scope.item = angular.extend({}, $scope.item);

      $scope.setColor = setColor;
      $scope.changeItem = changeItem;
      $scope.colorOnEnter = colorOnEnter;
      $scope.colorOnLeave = colorOnLeave;

      $scope.getProductItemUrl = DesignItem.getProductItemUrl;

      function setColor(color) {
        $scope.item.code = color.code;
        $scope.selectedColor = color;
      }

      function changeItem(itemId, colorId) {
        $scope.submitted = true;

        if (!itemId || !colorId) {
          return $scope.form.$setValidity('quantity', false);
        }

        $scope.form.$setValidity('quantity', true);
        $scope.onSelect({itemId: itemId, colorId: colorId});
      }

      function colorOnEnter(color) {
        $scope.colorOnHover = color;
      }

      function colorOnLeave() {
        $scope.colorOnHover = false;
      }
    }
  }
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').factory('MainMenu', ['$rootScope', 'Design', 'Viewport', MainMenu]);

  function MainMenu($rootScope, Design, Viewport) {
    var data = {
      active: Viewport.isExtraSmall() ? false : 'editProduct',
      advance: false
    };

    var service = {
      hasActive: hasActive,
      getActive: getActive,
      hasAdvance: hasAdvance,
      getAdvance: getAdvance,
      setActive: setActive,
      setAdvance: setAdvance,
      isActive: isActive
    };

    return service;

    function hasActive() {
      return !!data.active;
    }

    function getActive() {
      return data.active;
    }

    function hasAdvance() {
      return !!data.advance;
    }

    function getAdvance() {
      return data.advance;
    }

    function setActive(value) {
      var panelName = value;

      if (value !== 'textobject') {
        Design.deleteEmptyTextObjects();
      }

      data.active = value;
      setAdvance(false);
      $rootScope.$broadcast('activeMenuSet', value);
    }

    function setAdvance(value) {
      data.advance = value;
      $rootScope.$broadcast('advanceMenuSet', value);
    }

    function isActive(value) {
      var active = getActive();

      if (active === value) {
        return true;
      }

      if (value === 'addArt' && (active === 'uploadobject' || active === 'clipartobject')) {
        return true;
      }
    }
  }
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').factory('LocalDesign', ['localStorageService', LocalDesign]);

  function LocalDesign(localStorageService) {
    var service = {
      set: set,
      get: get,
      remove: remove
    };

    return service;

    function set(design) {
      if (localStorageService.isSupported === false) {
        return false;
      }

      return localStorageService.set('design.' + design.id, {designItems: design.designItems, printAreas: design.printAreas});
    }

    function get(id) {
      return localStorageService.get('design.' + id) || {};
    }

    function remove(id) {
      return localStorageService.remove('design.' + id);
    }
  }
})(angular);

(function() {
  'use strict';

  angular.module('designstudioApp').factory('OrderWarnModal', ['$uibModal', OrderWarnModal]);

  function OrderWarnModal($uibModal) {
    var modalInstance;
    var service = {
      open: openModal,
      close: closeModal
    };

    return service;

    function openModal() {
      modalInstance = $uibModal.open({
        templateUrl: 'views/modal/warn-order.html?ts='+Date.now(),
        keyboard: true,
        backdrop: true,
        size: 'lg'
      });
    }

    function closeModal() {
      modalInstance.close();
    }
  }
})();

(function(angular) {
  'use strict';

  angular.module('designstudioApp').directive('toggleButton', toggleButton);

  function toggleButton() {
    var directive = {
      restrict: 'E',
      scope: {
        onValue: '=',
        offValue: '='
      },
      require: '^ngModel',
      link: link,
      replace: true,
      template: [
        '<div class="toggle-button" ng-class="{on: isOn()}">',
          '<div class="toggle-button-bg"></div>',
          '<div class="toggle-button-option"></div>',
        '</div>'
      ].join('')
    };

    return directive;

    function link(scope, element, attrs, ctrl) {
      scope.isOn = isOn;
      // element.on('click', onClick);

      function isOn() {
        return ctrl.$viewValue === scope.onValue;
      }

      function onClick() {
        if (isOn()) {
          ctrl.$setViewValue(scope.offValue);
        } else {
          ctrl.$setViewValue(scope.onValue);
        }

        scope.$apply();
      }
    }
  }
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').directive('printMethodControls', [printMethodControls]);

  function printMethodControls() {
    var directive = {
      restrict: 'E',
      scope: {
        printMethodCode: '<',
        message: '<',
        showPopover: '<',
        placement: '<'
      },
      replace: true,
      template: [
        '<div id="printMethodControls" popover-is-open="showPopover" popover-trigger="none" popover-placement="{{placement}}" uib-popover="{{message}}">',
          '<strong ng-class="{active: printMethodCode === \'scr\'}">PRINTING</strong>&nbsp;&nbsp;',
          '<toggle-button on-value="\'emb\'" off-value="\'scr\'" ng-model="printMethodCode"></toggle-button>&nbsp;&nbsp;',
          '<strong ng-class="{active: printMethodCode === \'emb\'}">EMBROIDERY</strong>',
        '</div>',
      ].join('')
    };

    return directive;
  }
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').directive('checkoutFooter', [checkoutFooter]);

  function checkoutFooter() {
    var directive = {
      link: link,
      restrict: 'E',
      replace: true,
      scope: {},
      controller: 'MainFooterCtrl',
      templateUrl: 'views/layout/checkout-footer.html?ts=' + Date.now(),
    };

    return directive;

    function link(scope, element, attrs) {

    }
  }
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').directive('editProductItem', [editProductItem]);

  function editProductItem() {
    var directive = {
      scope: {},
      bindToController: {
        allowChangeItem: '<',
        designItem: '=',
        onAddNewColor: '&',
        onItemSelect: '&'
      },
      restrict: 'E',
      replace: true,
      controller: 'EditProductItemCtrl',
      controllerAs: '$ctrl',
      templateUrl: 'views/menu/productItem.html?ts=' + Date.now(),
    };

    return directive;
  }
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').controller('ColorPickerCtrl', ['DesignItem', 'InkColors', ColorPickerCtrl]);

  function ColorPickerCtrl (DesignItem, InkColors) {
    var vm = this;

    vm.canShowColor = canShowColor;
    vm.getTrackingId = getTrackingId;
    vm.getActiveItemColorHex = getActiveItemColorHex;
    vm.shirtColor = InkColors.getShirtColor();

    function canShowColor(color) {
      return true;
    }

    function getTrackingId(color) {
      return color.id ? color.id : color.hex;
    }

    function getActiveItemColorHex() {
      return DesignItem.color.hex;
    }
  }
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').directive('colorPicker', [colorPicker]);

  function colorPicker() {
    var directive = {
      scope: {},
      bindToController: {
        colors: '<',
        enableNoColor: '<',
        enableNoInk: '<',
        isActiveColor: '&',
        isActiveNoColor: '&',
        isActiveNoInk: '&',
        isIndicatedColor: '&',
        canShowColor: '&',
        onPickColor: '&',
        onEnterColor: '&',
        onLeaveColor: '&',
        onPickNoColor: '&',
        onPickNoInk: '&'
      },
      restrict: 'E',
      replace: true,
      controller: 'ColorPickerCtrl',
      controllerAs: '$ctrl',
      templateUrl: 'views/common/colorPicker.html?ts=' + Date.now(),
    };

    return directive;
  }
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').directive('dragAndSelect', ['$parse', '$document', dragAndSelect]);

  function dragAndSelect($parse, $document) {
    var directive = {
      restrict: 'A',
      scope: false,
      link: link
    };

    return directive;

    function link(scope, element, attrs) {
      var elementId;
      var startPos = {};
      var canStart = $parse(attrs['dragAndSelectCanStart']);
      var onStart = $parse(attrs['dragAndSelectOnStart']);
      var onDrag = $parse(attrs['dragAndSelectOnDragging']);
      var onEnd = $parse(attrs['dragAndSelectOnEnd']);

      element.on('mousedown', onMouseDown);
      scope.$on('destroy', onDestroy)

      attrs.$observe('dragAndSelectId', function (value) {
        elementId = value;
      });

      function onMouseDown(event) {
        var offset = element.offset();
        var x = event.pageX - offset.left;
        var y = event.pageY - offset.top;
        var box = angular.element('<div id="' + elementId + '"></div>');

        if (event.button !== 0) {
          return false;
        }

        if (canStart(scope, {$event: event}) !== true) {
          return false;
        }

        box.css({
          top: y,
          left: x,
          width: 0,
          height: 0
        });

        startPos.y = y;
        startPos.x = x;

        cleanSelectionBox();

        element.on('mousemove', onSelectionDrag);
        $document.on('mouseup', onMouseUp);
        element.prepend(box);
        onStart(scope);
        scope.$digest();
      }

      function onSelectionDrag(event) {
        var wsOffset = element.offset();
        var box = angular.element('#' + elementId);
        var adjustedPageX = event.pageX - wsOffset.left;
        var adjustedPageY = event.pageY - wsOffset.top;
        var w = Math.abs(adjustedPageX - startPos.x);
        var h = Math.abs(adjustedPageY - startPos.y);
        var t = startPos.y;
        var l = startPos.x;

        if (adjustedPageX - startPos.x < 0) {
          l = adjustedPageX;
        }

        if (adjustedPageY - startPos.y < 0) {
          t = adjustedPageY;
        }

        box.css({
          top: t,
          left: l,
          width: w,
          height: h
        });

        onDrag(scope);
        scope.$digest();
      }

      function onMouseUp(event) {
        if (event.button !== 0 || angular.element('#' + elementId).length === 0) {
          return true;
        }

        onEnd(scope);
        cleanSelectionBox();
        $document.off('mouseup', onMouseUp);
        scope.$digest();
      }

      function cleanSelectionBox() {
        angular.element('#' + elementId).remove();
        element.off('mousemove', onSelectionDrag);
      }

      function onDestroy() {
        $document.off('mouseup', onMouseUp);
      }
    }
  }
})(angular);

(function(angular, _) {
  'use strict';

  angular.module('designstudioApp').directive('multipleObjectSelection', ['$timeout', 'Design', 'PrintArea', 'PrintObject', 'MultipleObjectSelection', 'display', multipleObjectSelection]);

  function multipleObjectSelection($timeout, Design, PrintArea, PrintObject, MultipleObjectSelection, display) {
    var directive = {
      scope: {
        scale: '<',
        printObjects: '='
      },
      restrict: 'E',
      require: '^printArea',
      replace: true,
      link: link,
      templateUrl: 'views/workspace/multipleObjectSelection.html?ts=' + Date.now(),
    };

    return directive;

    function link(scope, element, attrs, printAreaCtrl) {
      var startX, startY, recoupLeft, recoupTop;
      var padding = 5;
      var startObjects = [];
      var startDiffs = [];

      scope.deleteAll = deleteAll;
      scope.getStyle = getStyle;
      scope.onDragStart = onDragStart;
      scope.onDragMove = onDragMove;
      scope.onDragStop = onDragStop;
      scope.copyToOtherSide = copyToOtherSide;
      scope.moveUp = moveUp;
      scope.moveDown = moveDown;

      // element.resizable({
      //     handles: {
      //       n: '.ui-resizable-n',
      //       e: '.ui-resizable-e',
      //       se: '.ui-resizable-se',
      //     },
      //     minHeight: 15,
      //     minWidth: 15,
      //     start: onStartResize,
      //     resize: onResizing,
      //     stop: onStopResize,
      //     aspectRatio: false
      // });

      // element.rotatable({
      //   handle: element.find('.ui-rotatable-handle'),
      //   start: onRotateStart,
      //   rotate: onRotating,
      //   stop: onRotateStop
      // });

      function onDragStart(event, ui) {
        var left = parseFloat(element.css('left'));
        var top = parseFloat(element.css('top'));

        left = isNaN(left) ? 0 : left;
        top = isNaN(top) ? 0 : top;

        startObjects = angular.copy(scope.printObjects);

        recoupLeft = left - ui.position.left;
        recoupTop = top - ui.position.top;

        startX = ui.position.left;
        startY = ui.position.top;

        startDiffs = getMatchingElements(scope.printObjects).map(function (index, el) {
          el = angular.element(el);

          return  {
            top: el.position().top - ui.position.top,
            left: el.position().left - ui.position.left
          };
        }).get();

        MultipleObjectSelection.setMultiSelect(true);
        printAreaCtrl.showBorder();
        printAreaCtrl.setIsMoving(true);
        angular.element('.print-area-guide').addClass('centered');
        scope.$apply();
      }

      function onDragMove(event, ui) {
        var matches = getMatchingElements(scope.printObjects);

        ui.position.left += recoupLeft;
        ui.position.top += recoupTop;

        matches.each(function (index, el) {
          el = angular.element(el);

          el.css({
            top: ui.position.top + startDiffs[index].top,
            left: ui.position.left + startDiffs[index].left
          });
        });
      }

      function onDragStop(event, ui) {
        angular.element('.print-area-guide').removeClass('centered');
        printAreaCtrl.setIsMoving(false);
        MultipleObjectSelection.setMultiSelect(false);
        scope.$apply(function () {
          scope.printObjects.forEach(function (po, index) {
            po.x = startObjects[index].x + (ui.position.left - startX) / display.scale / scope.scale;
            po.y = startObjects[index].y + (ui.position.top - startY) / display.scale / scope.scale;
          });
        });
      }

      function onStartResize(event, ui) {
        var propartional = false;
        var handle = angular.element(event.originalEvent.target);

        startObjects = angular.copy(scope.printObjects);

        if (handle.hasClass('ui-resizable-box')) {
          handle = handle.parent();
        }

        startX = parseFloat(element.css('left'));
        startY = parseFloat(element.css('top'));

        angular.element('#workspace').data('enableDeselect', false);

        propartional = handle.hasClass('ui-resizable-corner') || handle.hasClass('ui-resizable-se');
        element.resizable("option", "aspectRatio", propartional);
      }

      function onResizing(event, ui) {
        scope.$apply(function () {
          scope.printObjects.forEach(function (po, index) {
            po.scaleX = ui.size.width / ui.originalSize.width * startObjects[index].scaleX;
            po.scaleY = ui.size.height / ui.originalSize.height * startObjects[index].scaleY;
          });
        });
      }

      function onStopResize(event, ui) {
        scope.$apply(function () {
          // this small delay helps to prevent accidental printobject de-selection
          $timeout(function () {
            angular.element('#workspace').data('enableDeselect', true);
          }, 5);
        });
      }

      function onRotateStart(event, ui) {
        startObjects = angular.copy(scope.printObjects);

        scope.isRotated = isRotated((ui.angle.current * (180 / Math.PI)) % 360);
        angular.element('#workspace').data('enableDeselect', false);
      }

      function onRotating(event, ui) {
        var current = (ui.angle.current * (180 / Math.PI)) % 360;

        scope.isRotated = isRotated(current);

        scope.$apply(function () {
          scope.printObjects.forEach(function (po, index) {
            po.rotation = startObjects[index].rotation + current;
          });
        });
      }

      function onRotateStop(event, ui) {
        scope.isRotated = isRotated((ui.angle.current * (180 / Math.PI)) % 360);

        // this small delay helps to prevent accidental printobject de-selection
        $timeout(function () {
          angular.element('#workspace').data('enableDeselect', true);
        }, 5);
      }

      function deleteAll() {
        scope.printObjects.forEach(PrintArea.deletePrintObject);
        scope.printObjects.length = 0;
      }

      function copyToOtherSide() {
        var dupes = scope.printObjects.map(function (po) {
          return PrintObject.duplicatePrintObject(po, po.y, PrintArea.getNewZIndex());
        });

        Design.togglePrintArea();
        dupes.forEach(PrintArea.addPrintObject);
      }

      function moveUp() {
        scope.printObjects.slice().sort(function (a, b) {
          return b.zIndex - a.zIndex;
        }).forEach(PrintArea.printObjectMoveUp);
      }

      function moveDown() {
        scope.printObjects.slice().sort(function (a, b) {
          return a.zIndex - b.zIndex;
        }).forEach(PrintArea.printObjectMoveDown);
      }

      function getStyle() {
        var box;
        var matches = getMatchingElements(scope.printObjects);

        box = getBoundingBox(matches);

        box.top = getTop(matches);
        box.left = getLeft(matches);

        box.width = box.width + (padding * 2);
        box.height = box.height + (padding * 2);
        box.top = box.top - padding;
        box.left = box.left - padding;

        return box;
      }

      function getBoundingBox(elements) {
        var rects = elements.map(function (index, el) {
          var wrap = angular.element(el).children('.print-object-wrap')[0];

          return wrap.getBoundingClientRect();
        }).get();

        var top = Math.min.apply(Math, rects.map(function (rect) {
          return rect.top;
        }));

        var left = Math.min.apply(Math, rects.map(function (rect) {
          return rect.left;
        }));

        var bottom = Math.max.apply(Math, rects.map(function (rect) {
          return rect.bottom;
        }));

        var right = Math.max.apply(Math, rects.map(function (rect) {
          return rect.right;
        }));

        return {
          width: right - left,
          height: bottom - top
        };
      }

      function getTop(els) {
        var tops = els.map(function (index, el) {
          var wrap;

          el = angular.element(el);
          wrap = el.children('.print-object-wrap');

          return el.position().top + wrap.position().top;
        }).get();

        return Math.min.apply(Math, tops);
      }

      function getLeft(els) {
        var lefts = els.map(function (index, el) {
          var wrap;

          el = angular.element(el);
          wrap = el.children('.print-object-wrap');

          return el.position().left + wrap.position().left;
        }).get();

        return Math.min.apply(Math, lefts);
      }

      function getMatchingElements(printObjects) {
        return angular.element('.print-object').filter(function (index, el) {
          return printObjects.some(function (po) {
            return angular.element(el).scope().printObject === po;
          });
        });
      }

      function isRotated(rotation) {
        rotation = Math.round(rotation);

        if (rotation === 0) {
          return false;
        } else if (rotation - 360 === 0) {
          return false;
        } else {
          return true;
        }
      }
    }
  }
})(angular, _);

(function(angular, _) {
  'use strict';

  var component = {
    bindings: {},
    transclude: false,
    controller: controller,
    templateUrl: 'views/workspace/menu.html'
  };

  function controller(MainMenu, Design, PrintArea, PrintObject, Clipart, Viewport) {
    var vm = this;

    vm.setActive = MainMenu.setActive;
    vm.setAdvance = MainMenu.setAdvance;
    vm.isActive = MainMenu.isActive;

    vm.showVinyl = showVinyl;
    vm.getColorCount = getColorCount;
    vm.addTextObject = addTextObject;
    vm.addClipart = addClipart;
    vm.isUploadActive = isUploadActive;
    vm.isClipartActive = isClipartActive;

    function showVinyl() {
      return Design.isEmbroidery() === false;
    }

    function getColorCount() {
      return Design.data.designItems.map(function (designItem) {
        return designItem.colors.length
      }).reduce(function (a, b) {
        return a + b;
      }, 0);
    }

    function addTextObject() {
      if (Viewport.isExtraSmall()) {
        MainMenu.setActive('addText');
      }else {
        addRealTimeTextObject();
      }
    }

    function addRealTimeTextObject() {
      var template;
      var textobject;
      var lastTextObject;
      var lastInkColor;
      var text = '';

      Design.deleteEmptyTextObjects();

      lastTextObject = _.last(_.filter(PrintArea.data.printObjects, function (print) {
        return print.type === 'textobject';
      }));

      if (lastTextObject) {
        lastTextObject = angular.copy(lastTextObject);
        lastTextObject.details.text = text;
        lastInkColor = PrintArea.getLastSingleInkColorUsed();

        if (angular.isDefined(lastInkColor)) {
          lastTextObject.details.inkColor = lastInkColor;
        }

        duplicatePrintObject(lastTextObject);
      } else {
        template = PrintArea.getPrintObjectTemplate();
        template.text = text;

        textobject = PrintObject.createTextObject(template);
        PrintArea.printObjectAdd(PrintArea.data.printObjects, textobject);
        PrintObject.set(textobject);
      }
    }

    function addClipart() {
      Clipart.newMode = true;
      MainMenu.setActive('addArt');
      MainMenu.setAdvance(false);
    }

    function isUploadActive() {
      var active = MainMenu.getActive();
      var advance = MainMenu.getAdvance();

      return active === 'addArt' && advance.indexOf && advance.indexOf('upload') > -1;
    }

    function isClipartActive() {
      var active = MainMenu.getActive();
      var advance = MainMenu.getAdvance();

      return active === 'addArt' && (advance === false || advance.indexOf('clipart') > -1);
    }

    function duplicatePrintObject(printObject) {
      var dupe = PrintObject.duplicatePrintObject(printObject, printObject.y + 10, PrintArea.getNewZIndex());

      PrintArea.printObjectAdd(PrintArea.data.printObjects, dupe);
      PrintObject.set(dupe);
    }
  }

  controller['$inject'] = ['MainMenu', 'Design', 'PrintArea', 'PrintObject', 'Clipart', 'Viewport'];
  angular.module('designstudioApp').component('workspaceMenu', component);
})(angular, _);

(function(angular, _) {
  'use strict';

  var component = {
    bindings: {},
    transclude: false,
    controller: controller,
    templateUrl: 'views/workspace/tools.html'
  };

  function controller($rootScope, $timeout, $scope, MainMenu, Design, PrintArea, PrintObject, Instructions, SaveDesignModal, ShareModal, CheckoutModal, QuantitiesModal, Viewport) {
    var vm = this;
    var watch = $scope.$watch('Design.data.printAreas', function (newValue, oldValue) {
      if (Viewport.isExtraSmall()) {
        return false;
      }

      if (newValue !== oldValue) {
        if (!Design.getId()) {
          $timeout(function () {
            vm.savePopOver.show = true;
          }, 1);
        }

        watch();
      }
    }, true);

    $scope.Design = Design;

    vm.savePopOver = {
      show: false
    };

    vm.printAreas = Design.getSides();

    vm.toggleDistress = Design.toggleDistress;
    vm.hasDistress = Design.hasDistress;
    vm.setActive = MainMenu.setActive;
    vm.hasInstructions = Instructions.isSet;
    vm.hasClippingMask = PrintArea.hasClippingMask;
    vm.isEmbroidery = Design.isEmbroidery;

    vm.togglePrintArea = togglePrintArea;
    vm.openSaveModal = openSaveModal;
    vm.choosePlatform = choosePlatform;
    vm.rotateIsActive = rotateIsActive;
    vm.showClippingMask = showClippingMask;

    $rootScope.$on('designLoaded', updatePrintAreas);
    $rootScope.$on('printMethodSet', updatePrintAreas);

    function showClippingMask() {
      return Design.getInkColorCount() > 0;
    }

    function rotateIsActive() {
      return PrintArea.data.code != 'f';
    }

    function togglePrintArea() {
      PrintObject.set({});
      Design.togglePrintArea();
    }

    function updatePrintAreas() {
      vm.printAreas = Design.getSides();
    }

    function openSaveModal() {
      SaveDesignModal.open({
        onSuccess: function () {
          return ShareModal.open;
        }
      });

      PrintObject.set({});
    }

    function choosePlatform() {
      if (Design.hasMinQuantity() && Design.isLowVolume() === false) {
        CheckoutModal.open();
      } else {
        QuantitiesModal.open();
      }

      MainMenu.setActive(false);
      PrintObject.set({});
    }
  }

  controller['$inject'] = ['$rootScope', '$timeout', '$scope', 'MainMenu', 'Design', 'PrintArea', 'PrintObject', 'Instructions', 'SaveDesignModal', 'ShareModal', 'CheckoutModal', 'QuantitiesModal', 'Viewport'];

  angular.module('designstudioApp').component('workspaceTools', component);
})(angular, _);

(function(angular) {
  'use strict';

  var component = {
    bindings: {},
    transclude: false,
    controller: controller,
    templateUrl: 'views/workspace/recommendations.html'
  };

  function controller($scope, $timeout, Design, DesignItem, Catalog, BulkPricing, MainMenu, dialogs, $analytics) {
    var vm = this;
    var pricingTimeOutId;
    var items = [];
    var whiteList = [{
      style: 'g200',
      title: 'Industry Best Seller',
      ourLabel: 'Gildan Ultra Cotton 6 oz. T-Shirt'
    }, {
      style: 'g500',
      title: 'Most Cost-Effective',
      ourLabel: 'Gildan Heavy Cotton 5.3 oz. T-Shirt'
    }, {
      style: '3600',
      title: 'Light Weight Fashion Fit',
      ourLabel: 'Next Level Premium 4.3 oz. T-Shirt'
    }];

    var filter = whiteList.map(function (item) {
      return 'style:' + item.style;
    }).join(' OR ');

    $scope.design = Design.data;

    vm.recommendations = [];
    vm.$onInit = $onInit;
    vm.changeItem = changeItem;
    vm.getProductItemUrl = getProductItemUrl;

    function $onInit() {
      Catalog.search('', [], filter).then(function (response) {
        items = response.hits;
        items.forEach(function (item) {
          var match = whiteList.filter(function (wl) {
            return wl.style === item.style.toLowerCase();
          }).shift();

          item.title = match.title;
          item.ourLabel = match.ourLabel;
        });

        $scope.$watch('design', onDesignUpdate, true);
        $scope.$on('catalogItemSet', onDesignUpdate);
      });
    }

    function getProductItemUrl(item) {
      return DesignItem.getProductItemUrl(item.style, item.color.code);
    }

    function onDesignUpdate() {
      var enable = whiteList.filter(function (wl) {
        return wl.style === DesignItem.item.style.toLowerCase();
      }).length > 0;

      $timeout.cancel(pricingTimeOutId);

      if (enable === false || Design.isBlank() || Design.isEmbroidery() || Design.data.designItems.length > 1 || DesignItem.item.colors.length > 1) {
        vm.recommendations.length = 0;
        return false;
      }

      pricingTimeOutId = $timeout(function () {
        BulkPricing.getRecommendations(Design.data, items, Design.getPrintMethodCode()).then(function (quotes) {
          var activeItem = quotes.filter(function (item) {
            return item.style.toLowerCase() === DesignItem.item.style.toLowerCase();
          }).shift();

          vm.recommendations = quotes.slice();
          vm.recommendations.forEach(function (item) {
            item.active = activeItem === item;
            item.priceDelta = item.perPiece - activeItem.perPiece;
          });
        });
      }, 1000);
    }

    function changeItem(item, colorId) {
      var itemId = item.id;

      if (Design.isExistingItem(itemId)) {
        return false;
      }

      $scope.requestActive = true;

      Catalog.getItemById(itemId).then(function (catalogItem) {
        $scope.requestActive = false;

        checkMethods();

        function checkMethods() {
          var dlg;
          var missingPMs = Design.getIncompatibleItems(catalogItem);

          if (missingPMs.length) {
            dlg = dialogs.confirm('Are You Sure?', Catalog.getIncompatibleMethodsMsg(missingPMs, catalogItem), {
              size: 'md'
            });

            dlg.result.then(checkColors);
          } else {
            checkColors();
          }
        }

        function checkColors() {
          var dlg, missingColors;
          var shouldAsk = Catalog.shouldAskToDeleteColors(DesignItem.item, catalogItem);

          if (shouldAsk) {
            missingColors = Catalog.getMissingColors(DesignItem.item, catalogItem);
            dlg = dialogs.confirm('Are You Sure?', Catalog.getIncompatibleColorsMsg(missingColors, catalogItem, DesignItem.item), {
              size: 'md'
            });

            dlg.result.then(replaceItem);
          } else {
            replaceItem();
          }
        }

        function replaceItem() {
          var color;

          Design.changeNewItem(catalogItem);

          if (colorId) {
            color = catalogItem.availableColors.find(function (color) {
              return parseInt(color.id, 10) === parseInt(colorId, 10);
            });

            if (color) {
              DesignItem.setColor(color);
            }
          }

          MainMenu.setActive('editProduct');

          $analytics.eventTrack('recommendation change - type', {category: 'design studio', label: catalogItem.style});
        }
      });
    }
  }

  controller['$inject'] = ['$scope', '$timeout', 'Design', 'DesignItem', 'Catalog', 'BulkPricing', 'MainMenu', 'dialogs', '$analytics'];

  angular.module('designstudioApp').component('workspaceRecommendations', component);
})(angular);

(function(angular, Snap) {
  'use strict';

  angular.module('designstudioApp').directive('clippingObject', ['$rootScope', '$timeout', 'DesignItem', 'PrintObject', 'MultipleObjectSelection', 'MainMenu', 'Color', 'RenderQueue', clippingObject]);

  function clippingObject($rootScope, $timeout, DesignItem, PrintObject, MultipleObjectSelection, MainMenu, Color, RenderQueue) {
    var directive = {
      restrict: 'E',
      link: link,
      replace: true,
      scope: false,
      require: ['^printObject', '^printArea'],
      templateUrl: 'views/printobject/clipping.html?ts=' + Date.now()
    };

    return directive;

    function link(scope, element, attrs, controllers) {
      var isRendering = true;
      var printObjectCtrl = controllers[0];
      var printAreaCtrl = controllers[1];
      var image = new Image();
      var imageURL = 'images/clippingmask/' + scope.printObject.details.fileName;
      var guide = scope.guides.filter(function (guide) {
        return guide.default;
      }).shift();

      image.onload = onImageLoad;
      image.src = imageURL;
      image.crossOrigin = "Anonymous";

      RenderQueue.increment();

      scope.getFill = getFill;
      scope.getOpacity = getOpacity;
      scope.useMaskTexture = useMaskTexture;

      //this fixes a mask rendering bug on chrome after saving a design
      scope.$on('$destroy', function () {
        element.remove();
      });

      //IE9-10 pointer-events workaround
      element.parents('.print-object-wrap').bind('click', function (e) {
        element.parents('.print-object').hide();
        angular.element(document.elementFromPoint(e.originalEvent.pageX, e.originalEvent.pageY)).trigger(e);
        element.parents('.print-object').show();
      });

      function onImageLoad() {
        if (isFullScreen()) {
          useFullScreen();
        } else {
          useGuide();
        }

        setup();
      }

      function setup() {
        scope.$watch(watchBase, function () {
          if (isFullScreen()) {
            $timeout(function () {
              useFullScreen();
            });
          } else {
            $timeout(function () {
              useGuide();
            });
          }
        }, true);

        scope.$watch('printObject.zIndex', function () {
          if (isFullScreen()) {
            $timeout(function () {
              useFullScreen();
            });
          } else {
            useGuide();
          }
        });

        scope.$watch('printObject.details.fileName', updateImage);
        scope.$watch(watchActiveMenu, function (newValue, oldValue) {
          if (newValue === oldValue) {
            return newValue;
          }

          if (isFullScreen()) {
            useFullScreen();
          } else {
            useGuide();
          }
        });

        scope.$watch(watchMoving, function (newValue, oldValue) {
          if (newValue === oldValue) {
            return newValue;
          }

          if (isFullScreen()) {
            useFullScreen();
          }
        });

        scope.$on('catalogItemSet', function () {
          guide = scope.guides.filter(function (guide) {
            return guide.default;
          }).shift();

          if (isFullScreen()) {
            $timeout(function () {
              useFullScreen();
            });
          } else {
            $timeout(function () {
              useGuide();
            });
          }
        });
      }

      function updateImage(newValue, oldValue) {
        if (newValue === oldValue) {
          return newValue;
        }

        imageURL = 'images/clippingmask/' + scope.printObject.details.fileName;
        image.src = imageURL;
        image.onload = function () {
          if (isFullScreen()) {
            useFullScreen();
          } else {
            useGuide();
          }
        }
      }

      function getFill() {
        if (isFullScreen()) {
          return '606060';
        } else {
          return scope.getColorHex();
        }
      }

      function useMaskTexture() {
        return angular.isDefined(scope.getMaskTextureURL()) && isFullScreen() !== true;
      }

      function getOpacity() {
        if (isFullScreen()) {
          return 0.5;
        } else {
          return 1;
        }
      }

      function isFullScreen() {
        if (MainMenu.getActive() === 'clippingMask') {
          return true;
        } else if (MultipleObjectSelection.isMultiSelect()) {
          return true;
        } else if (printAreaCtrl.hasMovingObjects()) {
          return PrintObject.data.zIndex < scope.printObject.zIndex;
        }

        return false;
      }

      function useGuide() {
        var canvas;
        var top = 0;
        var left = 0;
        var width = 0;
        var height = 0;
        var scale = scope.display.scale * scope.workspace.scale;
        var guideTop = Math.floor(guide.y * scale);
        var guideLeft = Math.floor(guide.x * scale);
        var guideWidth = Math.floor(guide.width * scale);
        var guideHeight = Math.floor(guide.height * scale);
        var newScale = Math.min(guideWidth / image.width, guideHeight / image.height);
        var svg = Snap(element[0]);
        var clippingMask = svg.select('#clipping-mask');
        var viewBox = [0, 0];
        var pc = element.parents('#product-canvas');
        var canvasWidth = pc.width();
        var canvasHeight = pc.height();
        var paPos = element.parents('.print-area').position();

        width = Math.floor(image.width * newScale);
        height = Math.floor(image.height * newScale);
        top = Math.floor(guideHeight / 2 - height / 2);
        left = Math.floor(guideWidth / 2 - width / 2);

        viewBox.push(width);
        viewBox.push(height);

        svg.attr({
          viewBox: viewBox.join(' ')
        });

        svg.select('.clipping-rect').attr({
          width: guideWidth,
          height: guideHeight
        });

        if (DesignItem.color.useMask == false) {
          canvas = scope.getCSSStyle();

          svg.select('.clipping-productimage').attr({
            x: canvas.left - paPos.left - guideLeft,
            y: canvas.top - paPos.top - guideTop,
            width: canvas.width,
            height: canvas.height
          });
        }

        clippingMask.select('rect').attr({
          width: guideWidth,
          height: guideHeight
        });

        clippingMask.select('image').attr({
          x: left,
          y: top,
          width: width,
          height: height,
          'xlink:href': imageURL
        });

        updateBase();
      }

      function useFullScreen() {
        var canvas;
        var top = 0;
        var left = 0;
        var width = 0;
        var height = 0;
        var scale = scope.display.scale * scope.workspace.scale;
        var guideTop = Math.floor(guide.y * scale);
        var guideLeft = Math.floor(guide.x * scale);
        var guideWidth = Math.floor(guide.width * scale);
        var guideHeight = Math.floor(guide.height * scale);
        var newScale = Math.min(guideWidth / image.width, guideHeight / image.height);
        var svg = Snap(element[0]);
        var clippingMask = svg.select('#clipping-mask');
        var viewBox = [0, 0];
        var paPos = element.parents('.print-area').position();
        var pc = element.parents('#product-canvas');
        var canvasWidth = pc.width();
        var canvasHeight = pc.height();

        width = Math.floor(image.width * newScale);
        height = Math.floor(image.height * newScale);
        top = Math.floor(guideHeight / 2 - height / 2);
        left = Math.floor(guideWidth / 2 - width / 2);

        viewBox.push(canvasWidth);
        viewBox.push(canvasHeight);

        svg.attr({
          viewBox: viewBox.join(' ')
        });

        svg.select('.clipping-rect').attr({
          width: canvasWidth,
          height: canvasHeight
        });

        clippingMask.select('rect').attr({
          width: canvasWidth,
          height: canvasHeight
        });

        if (DesignItem.color.useMask == false) {
          svg.select('.clipping-productimage').attr({
            width: 0,
            height: 0
          });
        }

        clippingMask.select('image').attr({
          x: paPos.left + guideLeft + left,
          y: paPos.top + guideTop + top,
          width: width,
          height: height,
          'xlink:href': imageURL
        });

        updateBase();
      }

      function updateBase() {
        var scale = scope.display.scale * scope.workspace.scale;
        var guideTop = Math.floor(guide.y * scale);
        var guideLeft = Math.floor(guide.x * scale);
        var guideWidth = Math.floor(guide.width * scale);
        var guideHeight = Math.floor(guide.height * scale);
        var paPos = element.parents('.print-area').position();
        var pc = element.parents('#product-canvas');

        if (isFullScreen()) {
          printObjectCtrl.setPosition({
            top: 0 - paPos.top,
            left: 0 - paPos.left
          });

          element.css({
            width: pc.width(),
            height: pc.height()
          });
        } else {
          printObjectCtrl.setPosition({
            top: guideTop + 1,
            left: guideLeft + 1
          });

          element.css({
            width: guideWidth - 1,
            height: guideHeight - 1
          });
        }

        if (isRendering) {
          isRendering = false;
          RenderQueue.decrement();
        }
      }

      function watchBase() {
        return {
          scale: scope.workspace.scale
        };
      }

      function watchActiveMenu() {
        return MainMenu.getActive();
      }

      function watchMoving() {
        return printAreaCtrl.hasMovingObjects();
      }
    }
  }
})(angular, Snap);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').directive('menuClippingMask', [menuClippingMask]);

  function menuClippingMask() {
    var directive = {
      restrict: 'E',
      replace: true,
      scope: {},
      controller: 'EditClippingMaskCtrl',
      controllerAs: 'clipping',
      templateUrl: 'views/menu/clippingMask.html?ts=' + Date.now(),
    };

    return directive;
  }
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').controller('EditClippingMaskCtrl', ['Design', 'PrintArea', 'PrintObject', 'MainMenu', 'ClippingMasks',EditClippingMaskCtrl]);

  function EditClippingMaskCtrl(Design, PrintArea, PrintObject, MainMenu, ClippingMasks) {
    var vm = this;

    vm.toggle = toggle;
    vm.isEnabled = PrintArea.hasClippingMask;
    vm.moveUp = moveUp;
    vm.moveDown = moveDown;
    vm.isActive = isActive;
    vm.select = select;
    vm.setActive = MainMenu.setActive;
    vm.masks = ClippingMasks.data;

    function toggle() {
      var clipping = PrintArea.getClippingMask();
      var defaultMask = vm.masks.slice(0, 1).shift();

      if (clipping) {
        PrintArea.deletePrintObject(clipping);
      } else {
        clipping = PrintObject.createClippingObject({
          fileName: defaultMask.fileName,
          clippingMaskId: defaultMask.id,
          zIndex: PrintArea.getNewZIndex()
        });

        PrintArea.addPrintObject(clipping);
      }
    }

    function moveUp() {
      var clipping = PrintArea.getClippingMask();

      if (clipping) {
        PrintArea.printObjectMoveUp(clipping);
      }
    }

    function moveDown() {
      var clipping = PrintArea.getClippingMask();

      if (clipping) {
        PrintArea.printObjectMoveDown(clipping);
      }
    }

    function isActive(mask) {
      var clipping = PrintArea.getClippingMask();

      if (clipping) {
        return clipping.details.clippingMaskId === mask.id;
      } else {
        return false;
      }
    }

    function select(mask) {
      var clipping = PrintArea.getClippingMask();

      if (clipping) {
        clipping.details.fileName = mask.fileName;
        clipping.details.clippingMaskId = mask.id;
      } else {
        clipping = PrintObject.createClippingObject({
          fileName: mask.fileName,
          clippingMaskId: mask.id,
          zIndex: PrintArea.getNewZIndex()
        });

        PrintArea.addPrintObject(clipping);
      }
    }
  }
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').factory('ClippingMasks', [ClippingMasks]);

  function ClippingMasks() {
    var service = {
      etl: etl,
      data: []
    };

    return service;

    function etl(designData) {
      service.data = designData.availableClippingMasks.map(function (mask) {
        mask.id = parseInt(mask.id, 10);
        mask.previewFileName = mask.fileName.replace('.png', '.jpg');

        return mask;
      });
    }
  }
})(angular);

'use strict';

angular.module('designstudioApp')
  .directive('distressLegacy', ['$timeout', 'DesignItem', function ($timeout, DesignItem) {
    return {
      template: '<div class="distress"></div>',
      restrict: 'E',
      replace: true,
      scope: false,
      link: function postLink(scope, element, attrs) {
        var reDrawTimeOutId = null;
        var svgOrgWidth, svgOrgHeight;

        var updateSVG = function () {
          $timeout.cancel(reDrawTimeOutId);

          reDrawTimeOutId = $timeout(function () {
            var svg = element.find('svg');

            if (element.is(':visible') === false) {
              return false;
            }

            if (svg.length === 0) {
              addSVG();
            } else {
              svg = Snap(element[0]).select('svg');
              updateImage(svg, svg.select('#distressedImage'));
            }
          }, 0);
        };

        var addSVG = function () {
          Snap.load('resources/distress/distress-one.svg', function (Fragment) {
            var svg = Fragment.select('svg');
            var distressed = svg.image();

            distressed.node.id = 'distressedImage';

            svgOrgWidth = svg.node.getAttribute('width').replace('px', '');
            svgOrgHeight = svg.node.getAttribute('height').replace('px', '');

            Snap(element[0]).append(svg);
            updateImage(svg, distressed);
          });
        };

        var updateImage = function (svg, image) {
          var svgScale = svgOrgWidth / scope.canvas.width;
          var printAreaRatio = scope.canvas.width / scope.canvas.height;
          var svgVBRatio = svg.attr('viewBox').width / svg.attr('viewBox').height;
          var newWidth, newHeight, newVB, colorHex;
          var attrs = {
            x: (-scope.canvas.left + scope.getProductCanvasDims().left) * svgScale,
            y: (-scope.canvas.top + scope.getProductCanvasDims().top) * svgScale,
            width: scope.workspace.scale * scope.display.product.width * svgScale,
            height: scope.workspace.scale * scope.display.product.height * svgScale,
            mask: 'url(#curveClip)'
          };

          image.attr(attrs);
          image.node.setAttributeNS("http://www.w3.org/1999/xlink", 'href', scope.getProductImageUrl());

          // this breaks distress on the back

          // if (svgVBRatio < printAreaRatio) {
          //   newWidth = svgOrgWidth;
          //   newHeight = svgOrgWidth * (1 / printAreaRatio);
          // } else {
          //   newHeight = svgOrgHeight;
          //   newWidth = svgOrgHeight / (1 / printAreaRatio);
          // }

          newWidth = svgOrgWidth;
          newHeight = svgOrgWidth * (1 / printAreaRatio);

          svg.attr({
            viewBox: '0 0 ' + newWidth + ' ' + newHeight
          });

          svg.node.setAttribute('width', Math.floor(scope.canvas.width) + 'px');
          svg.node.setAttribute('height', Math.floor(scope.canvas.height) + 'px');
        };

        scope.$watch('workspace', function (newValue, oldValue) {
          if (scope.PrintArea.data.distressed == 1) {
            updateSVG();
          }
        }, true);

        scope.$on('catalogItemSet', function () {
          if (scope.PrintArea.data.distressed == 1) {
            updateSVG();
          }
        });

        scope.$on('catalogColorSet', function () {
          if (scope.PrintArea.data.distressed == 1) {
            updateSVG();
          }
        });

        scope.$on('printAreaSet', function (event, printArea) {
          if (printArea.distressed == 1) {
            updateSVG();
          }
        });

        scope.$watch('PrintArea.data.distressed', function (newValue, oldValue) {
          if (newValue !== oldValue && newValue == 1) {
            updateSVG();
          }
        });

        // This is a workaround for browsers who have trouble with pointer-events on svgs
        element.bind('mousedown touchstart touchmove touchend', function (e) {
          $(".print-object:visible").each(function() {
             var mouseX = e.originalEvent.pageX;
             var mouseY = e.originalEvent.pageY;
             var offset = $(this).offset();
             var width = $(this).width();
             var height = $(this).height();

            if (e.type === 'touchend') {
             mouseX = e.originalEvent.changedTouches[0].pageX;
             mouseY = e.originalEvent.changedTouches[0].pageY;
            }


             if (mouseX > offset.left && mouseX < offset.left+width && mouseY > offset.top && mouseY < offset.top+height) {
              $(this).trigger(e);
             }
          });
        });
      }
    };
  }]
);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').factory('DesignHistory', ['$rootScope', 'Design', DesignHistory]);

  function DesignHistory($rootScope, Design) {
    var max = 20;
    var data = [];
    var position = 0;
    var endWatch;

    var service = {
      init: init,
      undo: undo,
      redo: redo,
      canUndo: canUndo,
      canRedo: canRedo
    };

    return service;

    function init() {
      record({printAreas: Design.data.printAreas});
      startWatch();
    }

    function startWatch() {
      if (endWatch) {
        endWatch();
      }

      endWatch = $rootScope.$watch(function () {
        return {printAreas: Design.data.printAreas};
      }, function (design, oldValue) {
        if (angular.equals(design, oldValue)) {
          return false;
        }

        if (position > 0) {
          data = data.slice(position);
          position = 0;
        }

        record(design);
      }, true);
    }

    function record(design) {
      design = angular.copy(design);
      design = Design.transformForSave(design);
      data.unshift(design);
      data = data.slice(0, max);
    }

    function undo() {
      var design;

      position += 1;
      design = data[position];

      if (angular.isUndefined(design)) {
        position = data.length - 1;

        return false;
      }

      load(design);
    }

    function redo() {
      var design;

      position -= 1;
      design = data[position];

      if (angular.isUndefined(design)) {
        position = 0;

        return false;
      }

      load(design);
    }

    function canUndo() {
      return data.length > 1 && position < data.length - 1;
    }

    function canRedo() {
      return position > 0;
    }

    function load(design) {
      endWatch();
      Design.loadData(design);
      startWatch();
    }

    function display() {
      console.log('***', position, '***');
      data.forEach(function (design) {
        console.log(design.designItems[0].colors[0].name);
      });
    }
  }
})(angular);

(function(angular) {
  'use strict';

  function directive(DesignHistory) {
    var directive = {
      scope: {},
      link: link,
      replace: true,
      restrict: 'E',
      transclude: false,
      controller: controller,
      controllerAs: '$ctrl',
      templateUrl: 'views/workspace/history.html'
    };

    return directive;

    function controller() {
      var vm = this;

      vm.undo = DesignHistory.undo;
      vm.redo = DesignHistory.redo;
      vm.canUndo = DesignHistory.canUndo;
      vm.canRedo = DesignHistory.canRedo;
    }

    function link() {
    }
  }

  angular.module('designstudioApp').directive('workspaceHistory', ['DesignHistory', directive]);
})(angular);

(function(angular, WebFont) {
  'use strict';

  function directive() {
    var directive = {
      scope: {
        vinyl: '<',
        config: '<'
      },
      link: link,
      replace: true,
      restrict: 'E',
      transclude: false,
      templateUrl: 'views/common/vinylPreview.html'
    };

    return directive;

    function link(scope, element) {
      scope.$watch('vinyl', loadFont, true);
      scope.$watch('config', loadFont, true);

      function loadFont() {
        var fontName = scope.vinyl.namesFont;
        var fontFileName = fontName.toLowerCase().replace(/ /g, '_');

        WebFont.load({
          custom: {
            families: [fontName],
            urls: ['font-face/' + fontFileName + '/stylesheet.css']
          },
          active: function () {
            render();
          }
        });
      }

      function render() {
        var maxWidth = 0;
        var nameEl = element.find('.vinyl-preview-name');
        var numberEl = element.find('.vinyl-preview-number');
        var numbersTemplateEl = getNumbersTemplateEl();

        element.css({
          color: '#' + scope.vinyl.namesVinylColor.hex,
          fontFamily: scope.vinyl.namesFont
        });

        nameEl.toggle(!!scope.vinyl.names).css('fontSize', scope.config.size * 0.30);
        numberEl.toggle(!!scope.vinyl.numbers).css('fontSize', scope.config.size * 1);

        nameEl.css({
          position: 'absolute',
          width: 'initial',
          transform: 'scaleX(1)'
        });

        numberEl.css({
          position: 'absolute',
          width: 'initial',
          transform: 'scaleX(1)'
        });

        angular.element('body').append(numbersTemplateEl);
        maxWidth = numbersTemplateEl.width();

        nameEl.css({
          position: 'relative',
          width: maxWidth,
          transform: 'scaleX(' + getScaleX(maxWidth, nameEl) + ')'
        });

        numberEl.css({
          position: 'relative',
          width: maxWidth,
          transform: 'scaleX(' + getScaleX(maxWidth, numberEl) + ')'
        });

        angular.element('#vinyl-preview-template').remove();
      }

      function getScaleX(maxWidth, childEl) {
        var ratio = maxWidth / childEl.width();

        return ratio > 1 ? 1 : ratio;
      }

      function getNumbersTemplateEl() {
        var div = angular.element('<div></div>');

        div.attr('id', 'vinyl-preview-template');

        div.css({
          position: 'absolute',
          left: '-100%',
          height: '1em',
          lineHeight: '1em',
          visibility: 'hidden',
          whiteSpace: 'nowrap',
          color: '#' + scope.vinyl.namesVinylColor.hex,
          fontFamily: scope.vinyl.namesFont,
          fontSize: scope.config.size * 1
        });

        div.text('00');

        return div;
      }
    }
  }

  angular.module('designstudioApp').directive('vinylPreview', [directive]);
})(angular, WebFont);

(function(angular) {
  'use strict';

  function directive($rootScope, $document, $analytics, DesignHistory, PrintArea, PrintObject) {
    var directive = {
      link: link,
      scope: false,
      restrict: 'A',
      replace: true
    };

    return directive;

    function link(scope) {
      var copied = [];

      $document.bind('keydown', onKeyDown);
      scope.$on('$destroy', onDestroy);

      function onKeyDown(e) {
        if (isUndo(e)) {
          undo();
        } else if (isRedo(e)) {
          redo();
        } else if (isCopy(e)) {
          copy();
        } else if (isCut(e)) {
          cut();
        } else if (isPaste(e)) {
          paste();
        } else if (isMove(e) && e.keyCode === 37) {
          moveLeft();
        } else if (isMove(e) && e.keyCode === 38) {
          moveUp();
        } else if (isMove(e) && e.keyCode === 39) {
          moveRight();
        } else if (isMove(e) && e.keyCode === 40) {
          moveDown();
        }
      }

      function isUndo(e) {
        return e.ctrlKey && e.keyCode === 90 && notFocused() && DesignHistory.canUndo();
      }

      function isRedo(e) {
        return e.ctrlKey && e.keyCode === 89 && notFocused() && DesignHistory.canRedo();
      }

      function isCopy(e) {
        return e.ctrlKey && e.keyCode === 67 && notFocused() && hasSelected();
      }

      function isCut(e) {
        return e.ctrlKey && e.keyCode === 88 && notFocused() && hasSelected();
      }

      function isPaste(e) {
        return e.ctrlKey && e.keyCode === 86 && notFocused();
      }

      function isMove(e) {
        return notModified(e) && notFocused() && hasSelected();
      }

      function undo() {
        DesignHistory.undo();
        $analytics.eventTrack('shortcut - undo', {category: 'design studio'});
        $rootScope.$apply();
      }

      function redo() {
        $analytics.eventTrack('shortcut - redo', {category: 'design studio'});
        DesignHistory.redo();
        $rootScope.$apply();
      }

      function copy() {
        $analytics.eventTrack('shortcut - copy', {category: 'design studio'});

        if (scope.workspace.multiSelectedObjects.length) {
          copied = scope.workspace.multiSelectedObjects.slice();
        } else {
          copied = [PrintObject.data];
        }
      }

      function cut() {
        $analytics.eventTrack('shortcut - cut', {category: 'design studio'});

        if (scope.workspace.multiSelectedObjects.length) {
          copied = scope.workspace.multiSelectedObjects.slice();
        } else {
          copied = [PrintObject.data];
        }

        copied.forEach(PrintArea.deletePrintObject);
        scope.workspace.multiSelectedObjects.length = 0;
        PrintObject.set({});
        $rootScope.$apply();
      }

      function paste() {
        var dupes = copied.map(function (po) {
          return PrintObject.duplicatePrintObject(po, po.y + 5, PrintArea.getNewZIndex());
        });

        $analytics.eventTrack('shortcut - paste', {category: 'design studio'});
        dupes.forEach(PrintArea.addPrintObject);
        $rootScope.$apply();
      }

      function moveLeft() {
        if (scope.workspace.multiSelectedObjects.length) {
          scope.workspace.multiSelectedObjects.forEach(function (printObject) {
            printObject.x -= 5;
          });
        } else {
          PrintObject.data.x -= 5;
        }

        $analytics.eventTrack('shortcut - move left', {category: 'design studio'});
        $rootScope.$apply();
      }

      function moveUp() {
        if (scope.workspace.multiSelectedObjects.length) {
          scope.workspace.multiSelectedObjects.forEach(function (printObject) {
            printObject.y -= 5;
          });
        } else {
          PrintObject.data.y -= 5;
        }

        $analytics.eventTrack('shortcut - move up', {category: 'design studio'});
        $rootScope.$apply();
      }

      function moveRight() {
        if (scope.workspace.multiSelectedObjects.length) {
          scope.workspace.multiSelectedObjects.forEach(function (printObject) {
            printObject.x += 5;
          });
        } else {
          PrintObject.data.x += 5;
        }

        $analytics.eventTrack('shortcut - move right', {category: 'design studio'});
        $rootScope.$apply();
      }

      function moveDown() {
        if (scope.workspace.multiSelectedObjects.length) {
          scope.workspace.multiSelectedObjects.forEach(function (printObject) {
            printObject.y += 5;
          });
        } else {
          PrintObject.data.y += 5;
        }

        $analytics.eventTrack('shortcut - move down', {category: 'design studio'});
        $rootScope.$apply();
      }

      function notModified(e) {
        return e.ctrlKey === false && e.altKey === false && e.shiftKey === false;
      }

      function notFocused() {
        if ($document.context.activeElement === $document.context.body) {
          return true;
        }

        if ($document.context.activeElement === angular.element('.main-body')[0]) {
          return true;
        }

        return false;
      }

      function hasSelected() {
        return PrintObject.isSet() || scope.workspace.multiSelectedObjects.length > 0;
      }

      function onDestroy() {
        $document.unbind('keydown', onKeyDown);
      }
    }
  }

  angular.module('designstudioApp').directive('keyboardShortcuts', ['$rootScope', '$document', '$analytics', 'DesignHistory', 'PrintArea', 'PrintObject', directive]);
})(angular);

(function(angular) {
  'use strict';

  var component = {
    bindings: {
      enableBack: '<?',
      enableClose: '<?',
      onBack: '&?',
      onClose: '&?'
    },
    transclude: {
      'back': '?backText',
      'title': '?titleText'
    },
    controller: controller,
    templateUrl: 'views/common/sectionHeader.html'
  };

  function controller(MainMenu) {
    var vm = this;

    vm.$onInit = onInit;

    function onInit() {
      vm.enableBack = angular.isDefined(vm.enableBack) ? vm.enableBack : false;
      vm.enableClose = angular.isDefined(vm.enableClose) ? vm.enableClose : true;
      vm.onBack = angular.isDefined(vm.onBack) ? vm.onBack : defaultBack;
      vm.onClose = angular.isDefined(vm.onClose) ? vm.onClose : defaultClose;
    }

    function defaultBack() {
      MainMenu.setAdvance(false);
    }

    function defaultClose() {
      MainMenu.setActive(false);
    }
  }

  controller['$inject'] = ['MainMenu'];

  angular.module('designstudioApp').component('sectionHeader', component);
})(angular);

(function(angular, _) {
  'use strict';

  angular.module('designstudioApp').factory('UploadModal', ['$uibModal', 'UploadObject', 'UploadObjectImage', 'UploadPalette', 'Design', 'DesignItem', 'InkColors', 'Color', 'PrintArea', 'PrintObject', 'MainMenu', 'Viewport', Service]);

  function Service($uibModal, UploadObject, UploadObjectImage, UploadPalette, Design, DesignItem, InkColors, Color, PrintArea, PrintObject, MainMenu, Viewport) {
    var modalInstance;
    var activeOption = false;
    var history = [];
    var service = {
      goBack: goBack,
      hasBack: hasBack,
      getStep: getStep,
      startOver: startOver,
      changeStep: changeStep,
      clearSteps: clearSteps,
      isOptionActive: isOptionActive,
      setActiveOption: setActiveOption,
      getActiveOption: getActiveOption,
      getDefaultInkColor: getDefaultInkColor,
      toggleFlatten: toggleFlatten,
      open: openModal,
      addToDesign: addToDesign,
      getMaxLogoColorCount: getMaxLogoColorCount
    };

    return service;

    function goBack() {
      history.pop();
    }

    function hasBack() {
      return history.length > 1;
    }

    function getStep() {
      return history.slice(-1).shift();
    }

    function startOver() {
      history.length = 0;
      history.push('upload-start');
    }

    function changeStep(step) {
      history.push(step);
    }

    function clearSteps() {
      history.length = 0;
    }

    function isOptionActive(option) {
      return activeOption === option;
    }

    function setActiveOption(option) {
      activeOption = option;
    }

    function getActiveOption(option) {
      return activeOption;
    }

    function toggleFlatten(upload, palette) {
      var color;

      if (UploadObject.isSingleColorLogo(upload)) {
        color = UploadObject.getSingleColorLogoColor(upload);
        upload.details.swappings.length = 0;
        UploadObject.changeToSingleColor(upload, color);
      } else {
        UploadObject.changeToSingleColorLogo(upload, palette, upload.details.inkColor);
      }
    }

    function getDefaultInkColor(hex) {
      var inkColor;

      if (Color.isHexDark(hex)) {
        inkColor = _.findWhere(InkColors.data, {name: 'White'});
      } else {
        inkColor = _.findWhere(InkColors.data, {name: 'Black'});
      }

      return inkColor;
    }

    function openModal(uploadObject) {
      if (modalInstance) {
        modalInstance.close();
      }

      modalInstance = $uibModal.open({
        controller: 'UploadModalCtrl',
        controllerAs: '$ctrl',
        bindToController : true,
        keyboard: true,
        backdrop: 'static',
        size: 'lg',
        windowClass: 'upload-modal',
        templateUrl: 'views/modal/upload.html?ts=' + Date.now(),
        resolve: {
          palette: UploadPalette.getPaletteFromUpload(uploadObject),
          backgroundColor: UploadObjectImage.getBackgroundColor(uploadObject),
          isMostlyWhite: function () {
            return UploadObjectImage.isUploadMostlyWhite(uploadObject).then(function (res) {
              return res.isMostlyWhite;
            });
          },
          uploadObject: function () {
            return uploadObject;
          },
          shirtColorHex: function () {
            return DesignItem.color.hex;
          },
          isEmbroidery: function () {
            return Design.isEmbroidery();
          }
        }
      });

      return modalInstance;
    }

    function addToDesign(printObject) {
      PrintArea.addPrintObject(printObject);

      if (Viewport.isExtraSmall()) {
        PrintObject.set(printObject, true);
        MainMenu.setActive(false);
      } else {
        PrintObject.set(printObject);
      }
    }

    function getMaxLogoColorCount() {
      return InkColors.process.length;
    }
  }
})(angular, _);

(function(angular) {
  'use strict';

  controller.$inject = ["UploadModal", "UploadObject", "UploadObjectImage", "InkColors", "Design", "Viewport", "$uibModalInstance", "uploadObject", "palette", "backgroundColor", "shirtColorHex", "isMostlyWhite", "isEmbroidery"];
  angular.module('designstudioApp').controller('UploadModalCtrl', controller);

  function controller(UploadModal, UploadObject, UploadObjectImage, InkColors, Design, Viewport, $uibModalInstance, uploadObject, palette, backgroundColor, shirtColorHex, isMostlyWhite, isEmbroidery) {
    var vm = this;
    var imageType = UploadObjectImage.getImageType(uploadObject);
    var defaultInkColor = UploadModal.getDefaultInkColor(shirtColorHex);
    var maxLogoColorCount = UploadModal.getMaxLogoColorCount();

    UploadModal.clearSteps();

    vm.palette = palette;
    vm.shirtColorHex = shirtColorHex;
    vm.background = backgroundColor;
    vm.isEmbroidery = isEmbroidery;
    vm.colorCount = getColorCount();
    vm.hasWhiteBg = isWhiteBg();
    vm.isMostlyWhite = isMostlyWhite;
    vm.hasTransparentBg = isTransparentBg();
    vm.isExtraSmall = Viewport.isExtraSmall();

    vm.inkColors = InkColors.data;
    vm.isInkColorInUse = Design.isInkColorInUse;

    vm.isNegative = UploadObject.isNegative;
    vm.isFlatten = UploadObject.isSingleColorLogo;
    vm.toggleNegative = UploadObject.toggleNegative;
    vm.hasAClipping = UploadObject.hasAClipping;

    vm.goBack = UploadModal.goBack;
    vm.hasBack = UploadModal.hasBack;
    vm.getStep = UploadModal.getStep;
    vm.startOver = UploadModal.startOver;
    vm.changeStep = UploadModal.changeStep;
    vm.isOptionActive = UploadModal.isOptionActive;
    vm.setActiveOption = UploadModal.setActiveOption;
    vm.getActiveOption = UploadModal.getActiveOption;
    vm.toggleFlatten = UploadModal.toggleFlatten;

    vm.toggleBackground = toggleBackground;
    vm.toggleFlattenAndBackground = toggleFlattenAndBackground;
    vm.toggleMostCommonColor = toggleMostCommonColor;
    vm.startSCLogo = startSCLogo;
    vm.changeInkColor = changeInkColor;
    vm.isActiveSingleInkColor = isActiveSingleInkColor;
    vm.canChangeSCOptions = canChangeSCOptions;
    vm.hasMoreOptions = hasMoreOptions;
    vm.canInvert = canInvert;
    vm.canFlatten = canFlatten;
    vm.canFlattenAndRemove = canFlattenAndRemove;

    vm.askWhichPhoto = askWhichPhoto;
    vm.askWhichLogo = askWhichLogo;

    vm.selectSCPhoto = selectSCPhoto;
    vm.selectFCPhoto = selectFCPhoto;
    vm.selectBNWPhoto = selectBNWPhoto;

    vm.selectSCLogo = selectSCLogo;
    vm.selectMCLogo = selectMCLogo;

    if (vm.colorCount === 1 || (vm.colorCount === 2 && vm.hasWhiteBg)) {
      autoSCLogo();
    } else if (vm.colorCount <= 3 || imageType === 'logo') {
      askWhichLogo();
    } else if (imageType === 'photo') {
      askWhichPhoto();
    } else {
      askWhichUpload();
    }

    function autoSCLogo() {
      vm.upload = angular.copy(uploadObject);
      vm.toggleFlatten(vm.upload, vm.palette);

      if (vm.hasWhiteBg) {
        vm.toggleBackground(vm.upload);
      }

      vm.changeStep('single-color-logo');
    }

    function askWhichUpload() {
      vm.changeStep('upload-start');
    }

    function askWhichPhoto() {
      vm.singleColorPhoto = angular.copy(uploadObject);
      vm.blackAndWhitePhoto = angular.copy(uploadObject);
      vm.fullColorPhoto = angular.copy(uploadObject);

      UploadObject.changeToSingleColor(vm.singleColorPhoto, defaultInkColor);
      UploadObject.changeToBlackAndWhite(vm.blackAndWhitePhoto);
      UploadObject.changeToFullColor(vm.fullColorPhoto);

      vm.changeStep('photo-start');
      vm.setActiveOption('singleColorPhoto');
    }

    function askWhichLogo() {
      vm.singleColorLogo = angular.copy(uploadObject);
      vm.multiColorLogo = angular.copy(uploadObject);

      UploadObject.changeToSingleColor(vm.singleColorLogo, defaultInkColor);
      UploadObject.changeToMultiColor(vm.multiColorLogo, getColorCount());

      if (vm.isMostlyWhite) {
        vm.toggleNegative(vm.singleColorLogo);
      }

      if (vm.hasWhiteBg) {
        vm.toggleBackground(vm.multiColorLogo);
      }

      vm.changeStep('logo-start');
      vm.setActiveOption('singleColorLogo');
    }

    function startSCLogo() {
      vm.upload = angular.copy(vm.singleColorLogo);
      vm.changeStep('single-color-logo');
    }

    function selectSCPhoto(upload) {
      UploadModal.addToDesign(upload);
      $uibModalInstance.close();
    }

    function selectFCPhoto() {
      UploadObject.changeToFullColor(uploadObject);
      UploadModal.addToDesign(uploadObject);
      $uibModalInstance.close();
    }

    function selectBNWPhoto() {
      UploadObject.changeToBlackAndWhite(uploadObject);
      UploadModal.addToDesign(uploadObject);
      $uibModalInstance.close();
    }

    function selectSCLogo(upload) {
      var color = getActiveSingleInkColor(upload);

      if (vm.isFlatten(upload)) {
        UploadObject.changeToSingleColorLogo(upload, vm.palette, color);
      }

      UploadModal.addToDesign(upload);
      $uibModalInstance.close();
    }

    function selectMCLogo(upload) {
      var colorCount = vm.palette.length - upload.details.clippings.length;

      if (colorCount > maxLogoColorCount) {
        UploadObject.changeToFullColor(upload);
      } else {
        UploadObject.changeToMultiColor(upload, colorCount);
      }

      UploadModal.addToDesign(upload);
      $uibModalInstance.close();
    }

    function toggleBackground(upload) {
      UploadObject.toggleRemoveColor(upload, backgroundColor.hex);
    }

    function toggleMostCommonColor(upload) {
      UploadObject.toggleRemoveColor(upload, vm.palette.slice(0, 1).shift().hex);
    }

    function toggleFlattenAndBackground(upload, palette) {
      UploadObject.toggleRemoveColor(upload, backgroundColor.hex);
      vm.toggleFlatten(upload, palette);
    }

    function changeInkColor(upload, color) {
      if (UploadObject.isSingleColorLogo(upload)) {
        UploadObject.changeToSingleColorLogo(upload, vm.palette, color);
      } else {
        UploadObject.changeSingleColor(upload, color);
      }
    }

    function isActiveSingleInkColor(upload, color) {
      var existing = getActiveSingleInkColor(upload);

      return existing.id === color.id;
    }

    function getActiveSingleInkColor(upload) {
      var existing;

      if (UploadObject.isSingleColorLogo(upload)) {
        existing = UploadObject.getSingleColorLogoColor(upload);
      } else {
        existing = upload.details.inkColor;
      }

      return existing;
    }

    function canChangeSCOptions() {
      return vm.palette.length > 1;
    }

    function hasMoreOptions() {
      return vm.hasBack() === false && vm.getStep() !== 'upload-start';
    }

    function getColorCount() {
      return vm.palette.length;
    }

    function canInvert() {
      return vm.colorCount > 1;
    }

    function canFlatten() {
      return vm.background && vm.colorCount > 1 && vm.hasTransparentBg === true;
    }

    function canFlattenAndRemove() {
      return vm.background && vm.colorCount > 1 && vm.hasTransparentBg === false;
    }

    function isWhiteBg() {
      if (!vm.background) {
        return false;
      }

      return vm.background.r === 255 && vm.background.g === 255 && vm.background.b === 255;
    }

    function isTransparentBg() {
      if (!vm.background) {
        return false;
      }

      return vm.background.a < 5;
    }
  }
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').directive('uploadPreview', ['UploadObject', 'UploadObjectImage', 'UploadObjectCanvas', 'UploadPalette', 'Color', directive]);

  function directive(UploadObject, UploadObjectImage, UploadObjectCanvas, UploadPalette, Color) {
    var directive = {
      scope: {
        printObject: '<upload',
        palette: '<?',
        width: '<?',
        height: '<?'
      },
      link: link,
      replace: true,
      restrict: 'E',
      transclude: false,
      template: '<div class="upload-preview"><span class="glyphicon glyphicon-refresh spinner"></span><canvas width="0" height="0"></canvas></div>'
    };

    return directive;

    function link(scope, element) {
      var clippedCanvas, removeColorWorker, swapColorWorker;
      var Palette = scope.palette || [];
      var image = new Image();
      var canvas = element.find('canvas')[0];
      var context = canvas.getContext('2d');
      var imageURL = UploadObjectImage.getFilePreviewUrl(scope.printObject);
      var isMostlyWhite = false;

      image.src = imageURL;
      image.onload = onImageLoad;
      image.crossOrigin = "Anonymous";

      element.addClass('working');

      function onImageLoad() {
        UploadObjectImage.isUploadMostlyWhite(scope.printObject).then(function (response) {
          isMostlyWhite = response.isMostlyWhite;
          startCanvas();
        }, startCanvas);
      }

      function startCanvas() {
        var multiColor = scope.printObject.details.multiColor;

        if (multiColor == 2 || multiColor == 1) {
          setMultiColorCanvas().then(setup);
        } else if (multiColor == 0) {
          setSingleColorCanvas();
          setup();
        } else if (multiColor == 3) {
          setGrayScaleCanvas();
          setup();
        }
      }

      function setSingleColorCanvas() {
        var clipping = scope.printObject.details.clipping;
        var rgb = Color.hex2rgb(scope.printObject.details.inkColor.hex);

        if (isMostlyWhite) {
          clipping = clipping === 'ffffff' ? '000000' : 'ffffff';
        }

        clippedCanvas = UploadObjectCanvas.clipSingleColor(image, rgb, clipping, scope.printObject.threshold);
      }

      function setGrayScaleCanvas() {
        clippedCanvas = UploadObjectCanvas.grayScaleImage(image);
      }

      function setMultiColorCanvas() {
        var remove = UploadPalette.removeColor(image, scope.printObject.details.clippings, Palette);

        if (removeColorWorker) {
          removeColorWorker.terminate();
        }

        if (swapColorWorker) {
          swapColorWorker.terminate();
        }

        element.addClass('working');
        removeColorWorker = remove.worker;

        return remove.then(function (removedCanvas) {
          var swap = UploadPalette.swapColor(removedCanvas, scope.printObject.details.swappings, Palette);

          swapColorWorker = swap.worker;

          return swap.then(function (swappedCanvas) {
            clippedCanvas = swappedCanvas;

            return clippedCanvas;
          });
        });
      }

      function setup() {
        updateBase();

        scope.$watch('printObject', onMultiColor, true);
      }

      function onMultiColor(newValue, oldValue) {
        var multiColor = scope.printObject.details.multiColor;

        if (multiColor == 2 || multiColor == 1) {
          setMultiColorCanvas().then(updateBase);
        } else if (multiColor == 0) {
          setSingleColorCanvas();
          updateBase();
        } else if (multiColor == 3) {
          setGrayScaleCanvas();
          updateBase();
        }
      }

      function updateBase() {
        updateSize();
        element.removeClass('working');
      }

      function updateSize() {
        var width = scope.width || element.parent().width();
        var height = scope.height || element.parent().height();
        var maxSize = Math.min(width, height) - 10;
        var dims = UploadObjectImage.getDimensions(image, maxSize);

        canvas.width = dims.width;
        canvas.height = dims.height;
        context.drawImage(clippedCanvas, 0, 0, dims.width, dims.height);
      }
    }
  }
})(angular);

(function(angular) {
  'use strict';

  var component = {
    bindings: {
      isTrue: '<',
      isDisabled: '<',
      onClick: '&'
    },
    transclude: {
      'label': '?checkmarkLabel'
    },
    controller: controller,
    templateUrl: 'views/common/checkmark.html'
  };

  function controller() {
    var vm = this;
  }

  angular.module('designstudioApp').component('checkmark', component);
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').factory('UploadObjectCanvas', [Service]);

  function Service() {
    var service = {
      clipMultiColor: clipMultiColor,
      grayScaleImage: grayScaleImage,
      clipSingleColor: clipSingleColor
    };

    return service;

    function clipMultiColor(image, clipping) {
      var imageData;
      var canvas = angular.element('<canvas></canvas>')[0];
      var context = canvas.getContext('2d');

      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0, image.width, image.height);
      imageData = context.getImageData(0, 0, image.width, image.height);

      if (clipping === "ffffff") {
        for (var i = 0; i < imageData.data.length; i += 4) {
          multiColorClipWhite(imageData, i);
        }
      }

      context.putImageData(imageData, 0, 0);

      return canvas;
    }

    function multiColorClipWhite(imageData, i) {
      var r, g, b, a;

      r = imageData.data[i];
      g = imageData.data[i+1];
      b = imageData.data[i+2];
      a = imageData.data[i+3];

      if(r >= 221 && g >=184 && b >=184){
        a = 0;
      }else if(g >= 221 && b >=184 && r >=184){
       a = 0;
      }else if(b >= 221 && r >=184 && g >=184){
       a = 0;
      }

      imageData.data[i+3] = a;//is the transparency.
    }

    function grayScaleImage(image) {
      var imageData;
      var canvas = angular.element('<canvas></canvas>')[0];
      var context = canvas.getContext('2d');

      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0, image.width, image.height);
      imageData = context.getImageData(0, 0, image.width, image.height);

      for (var i = 0; i < imageData.data.length; i += 4) {
        grayScale(imageData, i);
      }

      context.putImageData(imageData, 0, 0);

      return canvas;
    }

    function grayScale(imageData, i) {
      var brightness = 0.2126 * imageData.data[i];

      brightness += 0.7152 * imageData.data[i + 1];
      brightness += 0.0722 * imageData.data[i + 2];

      imageData.data[i] = brightness;
      imageData.data[i + 1] = brightness;
      imageData.data[i + 2] = brightness;
    }

    function clipSingleColor(image, rgb, clipping, threshold) {
      var imageData;
      var canvas = angular.element('<canvas></canvas>')[0];
      var context = canvas.getContext('2d');

      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0, image.width, image.height);
      imageData = context.getImageData(0, 0, image.width, image.height);

      if (threshold.size > 0) {
        for (var i = 0; i < imageData.data.length; i += 4) {
          singleColorThreshold(imageData, rgb, i, threshold.size, clipping);
        }
      } else {
        if (clipping == "000000") {
          for (var i = 0; i < imageData.data.length; i += 4) {
            singleColorClipBlack(imageData, rgb, i);
          }
        } else {
          for (var i = 0; i < imageData.data.length; i += 4) {
            singleColorClipWhite(imageData, rgb, i);
          }
        }
      }

      context.putImageData(imageData, 0, 0);

      return canvas;
    }

    function singleColorClipBlack(imageData, rgb, i) {
      var r, g, b, a;

      r = imageData.data[i]   *  0.309;
      g = imageData.data[i+1] *  0.609;
      b = imageData.data[i+2] *  0.082;
      a = imageData.data[i+3] * 0;

      imageData.data[i] = rgb.r;   // Red component
      imageData.data[i + 1] = rgb.g; // Green component
      imageData.data[i + 2] = rgb.b; // Blue component

      if (imageData.data[i+3] > 5) {
        imageData.data[i + 3] =  r + g + b + a;
      }
    }

    function singleColorClipWhite(imageData, rgb, i) {
      var r, g, b, a;

      r = imageData.data[i]   *  -0.309;
      g = imageData.data[i+1] *  -0.609;
      b = imageData.data[i+2] *  -0.082;
      a = imageData.data[i+3] * 1;

      imageData.data[i] = rgb.r;   // Red component
      imageData.data[i + 1] = rgb.g; // Green component
      imageData.data[i + 2] = rgb.b; // Blue component
      imageData.data[i + 3] =  r + g + b + a;
    }

    function singleColorThreshold(imageData, rgb, i, threshold, clipping) {
      var r, g, b, a, newA;

      r = imageData.data[i];
      g = imageData.data[i + 1];
      b = imageData.data[i + 2];

      newA = (0.2126 * r) + (0.7152 * g) + (0.0722 * b) >= threshold ? 255 : 0;

      if (clipping === '000000') {
        if (newA === 255) {
          imageData.data[i] = rgb.r;
          imageData.data[i + 1] = rgb.g;
          imageData.data[i + 2] = rgb.b;
        } else {
          imageData.data[i] = 0;
          imageData.data[i + 1] = 0;
          imageData.data[i + 2] = 0;
          imageData.data[i + 3] = 0;
        }

      } else {
        if (newA === 255) {
          imageData.data[i] = 0;
          imageData.data[i + 1] = 0;
          imageData.data[i + 2] = 0;
          imageData.data[i + 3] = 0;
        } else {
          imageData.data[i] = rgb.r;
          imageData.data[i + 1] = rgb.g;
          imageData.data[i + 2] = rgb.b;
        }
      }
    }
  }
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').factory('UploadObjectImage', ['$q', 'JSONService', 'AWSService', 'Color', 'config', Service]);

  function Service($q, JSONService, AWSService, Color, config) {
    var service = {
      getDimensions: getDimensions,
      getOrigImage: getOrigImage,
      getPreviewImage: getPreviewImage,
      getFilePreviewUrl: getFilePreviewUrl,
      getBackgroundColor: getBackgroundColor,
      isUploadMostlyWhite: isUploadMostlyWhite,
      getImageType: getImageType
    };

    return service;

    function getDimensions(image, maxSize) {
      var max = maxSize || 200;
      var dims = {width: 0, height: 0};
      var widthToHeight = image.width / image.height;

      if(widthToHeight>=1){
        dims.width=max;
        dims.height=max/widthToHeight;
      }else{
        dims.height=max;
        dims.width=max/(1/widthToHeight);
      }

      return dims;
    }

    function getOrigImage(printObject) {
      return getImage(getFileOrigUrl(printObject));
    }

    function getPreviewImage(printObject) {
      return getImage(getFilePreviewUrl(printObject));
    }

    function getFilePreviewUrl(printObject) {
      return config.uploadURL + '/preview/' + printObject.details.uploadFile.fileName + '.png';
    }

    function getFileOrigUrl(printObject) {
      return config.uploadURL + '/orig/' + printObject.details.uploadFile.fileName + printObject.details.uploadFile.origExt;
    }

    function getBackgroundColor(uploadObject) {
      var url = uploadObject.details.uploadFile.fileName + '.png';

      return AWSService.getBackgroundColor(url).then(function (color) {
        if (color) {
          color.hex = Color.rgb2hex(color.r, color.g, color.b);
        }

        return color;
      });
    }

    function isUploadMostlyWhite(uploadObject) {
      return AWSService.isImageMostlyWhite(uploadObject.details.uploadFile.fileName + '.png');
    }

    function getImageType(printObject) {
      var type = 'image';

      if (printObject.details.uploadFile.origName.match(/logo/i)) {
        return 'logo';
      }

      if (printObject.details.uploadFile.origName.match(/img_/i)) {
        return 'photo';
      }

      return type;
    }

    function getImage(url) {
      var deferred = $q.defer();
      var image = new Image();

      image.src = url;

      image.onload = function () {
        deferred.resolve(image);
      }

      image.onerror = function () {
        getImage('resources/fileicons/default.png').then(deferred.resolve);
      }

      return deferred.promise;
    }
  }
})(angular);

(function() {
  'use strict';

  angular.module('designstudioApp').factory(
    'AskForQuantity',
    ['$document', '$rootScope', 'dialogs', 'Design', 'CatalogItemComparable', AskForQuantity]
  );

  function AskForQuantity($rootScope, $document, dialogs, Design, CatalogItemComparable) {
    var isAskingFlag = false;

    var service = {
      isAbleToAsk: isAbleToAsk,
      setTitleIfNotAsking: setTitleIfNotAsking,
      setIsAsking: setIsAsking,
      isAsking: isAsking,
      ask: ask
    };

    return service;

    function setTitleIfNotAsking(itemId) {
      if (isAsking() === 'false') {
        $document[0].title = $document[0].title + ' - 6+ Pieces';
      }
    }

    function isAbleToAsk(itemId, methodCode) {
      return (angular.isDefined(itemId) || angular.isDefined(methodCode) || !angular.isDefined(Design.data.id));
    }

    function ask(itemId, colorId, methodCode) {
      if(isAsking()) {
        showQuestion(itemId, colorId, methodCode);
      } else {
        if (Design.isAbleToReadDefault(itemId, colorId, methodCode)) {
          Design.readDefault(itemId, colorId, methodCode);
        } else {
          Design.read();
        }
      }
    }

    function isAsking() {
      return isAskingFlag;
    }

    function setIsAsking(askQuantity, method, itemId) {
      isAskingFlag = (
        (angular.isDefined(itemId)) ||
        (askQuantity !== 'false')
      );
    }

    function showQuestion(itemId, colorId, methodCode) {
      if ((itemId === null || itemId === undefined) && (methodCode !== null && methodCode !== undefined)) {
        CatalogItemComparable.setLowQtyLabelByPrintMethod(methodCode);
        openModal(itemId, colorId, methodCode);
      } else {
        CatalogItemComparable.getByIdAndColor(itemId, colorId).then(function(){
          openModal(itemId, colorId, methodCode);
        });
      }
    }

    function openModal(itemId, colorId, methodCode) {
      var dlg = dialogs.create(
        'views/modal/ask-quantity.html',
        'AskQuantityDialogCtrl',
        {itemId: itemId, colorId: colorId},
        {backdrop: 'static', size: 'md', windowClass:'check-quantity-modal'},
        '$ctrl'
      );
      dlg.result.then(function(data){
        if(angular.isUndefined(Design.data.id)) {
          Design.readDefault(data.itemId, data.colorId, methodCode);
        }
        isAskingFlag = false;
      }, function(){
        if(angular.isUndefined(Design.data.id)) {
          if (angular.isUndefined(methodCode) || methodCode === null) {
            Design.read();
          } else {
            Design.readDefault(itemId, colorId, methodCode);
          }
        }

        isAskingFlag = false;
      });
    }

  }
})();

(function() {
  'use strict';

  angular.module('designstudioApp').factory(
    'CatalogItemComparable',
    ['APIService', 'Design', CatalogItemComparable]
  );

  function CatalogItemComparable(APIService, Design) {
    var lowQuantityLabel = '1-5';
    var mediumQuantityLabel = '6-100';
    var highQuantityLabel = '101+';
    var scrPrintingLowQtyLabel = '3-5';
    var defaultItemId = 808;
    var defaultColorId = 2202;
    var lowQuantityItemId;
    var lowQuantityColorId;

    var service = {
      getByIdAndColor: getByIdAndColor,
      getLowQtyLabel: getLowQtyLabel,
      getLowQtyItemId: getLowQtyItemId,
      getLowQtyColorId: getLowQtyColorId,
      getMediumQtyLabel: getMediumQtyLabel,
      getHighQtyLabel: getHighQtyLabel,
      setLowQtyLabelByPrintMethod: setLowQtyLabelByPrintMethod
    };

    return service;

    function getByIdAndColor(origItemId, origColorId) {
      var itemId = origItemId || defaultItemId;
      var colorId = origColorId || defaultColorId;

      return APIService.getCatalogItemComparables(itemId).then(function(comparables){
        if (comparables.length > 0) {
          angular.forEach(comparables, function(comparable){
            if (comparable.relationshipType === 'dtg') {
              if (parseInt(comparable.primaryColorId) === parseInt(colorId)) {
                setLowQtyItemId(comparable.secondaryCatalogItemId);
                setLowQtyColorId(comparable.secondaryColorId);
              }
            }
          });
        } else {
          return Design.readDefault(origItemId, origColorId, null).then(function(d) {
            setLowQtyLabelByPrintAreas(d.data.printAreas);
          });
        }
      });
    }

    function setLowQtyLabelByPrintAreas(printAreas) {
      angular.forEach(printAreas, function(printArea){
        return setLowQtyLabelByPrintMethod(printArea.printMethod.code);
      });
    }

    function setLowQtyLabelByPrintMethod(printMethod) {
      if (printMethod === 'emb') {
        setLowQtyLabel(null);
      }
      if (printMethod === 'scr') {
        setLowQtyLabel(scrPrintingLowQtyLabel);
      }
      if (printMethod === 'dtg') {
        setLowQtyLabel(lowQuantityLabel);
      }
    }

    function setLowQtyLabel(val) {
      lowQuantityLabel = val;
    }

    function setLowQtyItemId(val) {
      lowQuantityItemId = val;
    }

    function setLowQtyColorId(val) {
      lowQuantityColorId = val;
    }

    function getLowQtyLabel() {
      return lowQuantityLabel;
    }

    function getLowQtyItemId(){
      return lowQuantityItemId;
    }

    function getLowQtyColorId(){
      return lowQuantityColorId;
    }

    function getMediumQtyLabel() {
      return mediumQuantityLabel;
    }

    function getHighQtyLabel() {
      return highQuantityLabel;
    }

  }
})();

(function() {
  'use strict';

  angular.module('designstudioApp').factory('StartUp', ['PhillyUnionStartUp', StartUp]);

  function StartUp(PhillyUnionStartUp) {

    var service = {
      init: init,
      runPhillyUnionStartUp: runPhillyUnionStartUp
    };

    return service;

    function init(_startUp) {
      var func = 'run' + _startUp.replace('-', ' ').replace(/[a-zA-Z]+/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }).replace(' ', '') + 'StartUp';

      if (angular.isFunction(service[func])) {
        service[func]();
      }
    }

    function runPhillyUnionStartUp() {
      PhillyUnionStartUp.init();
    }

  }
})();

(function() {
  'use strict';

  angular.module('designstudioApp').factory('PhillyUnionStartUp', ['MainMenu', 'Clipart', PhillyUnionStartUp]);

  function PhillyUnionStartUp(MainMenu, Clipart) {

    var service = {
      init: init
    };

    return service;

    function init() {
      Clipart.newMode = true;
      Clipart.searchTerm = 'philly union';
      Clipart.addShortcut('philly union');
      MainMenu.setActive('addArt');
    }

  }
})();

(function(angular) {
  'use strict';

  angular.module('designstudioApp').factory('AutoItemSwitch', ['DesignItem', 'Catalog', 'APIService', Service]);

  function Service(DesignItem, Catalog, APIService) {
    var alreadyAutoSwitched = [];
    var service = {
      getProduct: getProduct,
      addToSwitched: addToSwitched,
      wasAlreadySwitched: wasAlreadySwitched
    };

    return service;

    function addToSwitched(style) {
      alreadyAutoSwitched.push(style);
    }

    function wasAlreadySwitched(style) {
      return alreadyAutoSwitched.includes(style);
    }

    function getProduct(designItem) {
      return APIService.getCatalogItemComparables(designItem.catalogItemId).then(function (comparables) {
        return comparables.map(function (comparable) {
          comparable.primaryCatalogItemId = parseInt(comparable.primaryCatalogItemId, 10);
          comparable.primaryColorId = parseInt(comparable.primaryColorId, 10);
          comparable.secondaryCatalogItemId = parseInt(comparable.secondaryCatalogItemId, 10);
          comparable.secondaryColorId = parseInt(comparable.secondaryColorId, 10);

          return comparable;
        });
      }).then(function (comparables) {
        return onComparables(designItem, comparables);
      });
    }

    function onComparables(designItem, comparables) {
      var matchingComparables = getMatchingComparables(designItem, comparables);

      if (matchingComparables.length === 0 || matchingComparables.length !== designItem.colors.length) {
        return false;
      }

      return Catalog.getItemById(matchingComparables[0].secondaryCatalogItemId).then(function (catalogItem) {
        var matches = flattenMatches(designItem.colors, catalogItem.availableColors, matchingComparables);

        return hasAllMatchingSizes(matches) ? catalogItem : false;
      });
    }

    function hasAllMatchingSizes(matches) {
      return matches.every(function (match) {
        return match.existing.sizes.every(function (sizeType) {
          var withQuantity = sizeType.sizes.filter(function (size) {
            return size.quantity > 0;
          });

          return withQuantity.filter(function (size) {
            return DesignItem.hasSize(match.available.sizes, size, sizeType.sizeType);
          }).length === withQuantity.length;
        });
      });
    }

    function getMatchingComparables(designItem, comparables) {
      return designItem.colors.map(function (color) {
        return comparables.find(function (comp) {
          if (comp.primaryCatalogItemId === comp.secondaryCatalogItemId) {
            return false;
          }

          return comp.primaryCatalogItemId === parseInt(designItem.catalogItemId, 10) && comp.primaryColorId === parseInt(color.id, 10);
        });
      }).filter(angular.isDefined);
    }

    function flattenMatches(existingColors, availableColors, matchingComparables) {
      return matchingComparables.map(function (comp) {
        var match = {};

        match.existing = existingColors.find(function (color) {
          return comp.primaryColorId === parseInt(color.id, 10);
        });

        match.available = availableColors.find(function (color) {
          return comp.secondaryColorId === parseInt(color.id, 10);
        });

        return match;
      });
    }
  }
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').factory('APIService', ['$rootScope', '$http', 'config', APIService]);

  function APIService($rootScope, $http, config) {
    var baseUrl = config.api.url;

    var service = {
      getQuote: getQuote,
      getConfig: getConfig,
      reminderEmail: reminderEmail,
      getClipartCategories: getClipartCategories,
      designIdeaSearch: designIdeaSearch,
      getDesignCategoriesByBranding: getDesignCategoriesByBranding,
      getCatalogItemComparables: getCatalogItemComparables,
      trackPageView: trackPageView,
      getDesignById: getDesignById,
      saveDesign: saveDesign,
      getPromoByCode: getPromoByCode,
      getValidPromoCodes: getValidPromoCodes,
      getItemCompatibles: getItemCompatibles,
      getItemById: getItemById,
      getDTGSafeItems: getDTGSafeItems,
      getNewDesign: getNewDesign,
      shareDesign: shareDesign,
      isExistingDesign: isExistingDesign,
      getDesignsByEmail: getDesignsByEmail
    };

    return service;

    function saveDesign(data, saveConfig) {
      var url = baseUrl + '/studio/designs';

      if (!data['id']) {
        return $http.post(url, [data, saveConfig]);
      }

      return $http.put(url + '/' + data['id'], [data, saveConfig]);
    }

    function getDesignById(id) {
      return $http.get(baseUrl + '/studio/designs/' + id, {cache: false}).success(onDesignSuccess).error(onDesignError);
    }

    function getNewDesign(itemId, colorId, methodCode) {
      var newDesignData = {
        "catalogitem_id": angular.isDefined(itemId) ? itemId : null,
        "catalogitemcolor_id": angular.isDefined(colorId) ? colorId : null,
        "printmethod_code": angular.isDefined(methodCode) ? methodCode : null
      }

      return $http.post(baseUrl + '/studio/blankdesigns', newDesignData);
    }

    function getQuote(pricingData) {
      return $http.post(baseUrl + '/studio/pricing', pricingData).then(function (response) {
        return (response.data && response.data.length > 1) ? response.data : response.data.shift();
      });
    }

    function getConfig() {
      return $http.get(baseUrl + '/studio/config', {cache: true}).then(function (response) {
        return response.data;
      });
    }

    function getClipartCategories() {
      return $http.get(baseUrl + '/studio/clipart/categories', {cache: true});
    }

    function getCatalogItemComparables(catalogItemId) {
      var url = baseUrl + '/studio/products/' + catalogItemId + '/comparables';

      return $http.get(url, {cache: true}).then(function (response) {
        return angular.isDefined(response.data.data) ? response.data.data : [];
      });
    }

    function designIdeaSearch(term) {
      return $http.get(baseUrl + '/studio/ideas/search/' + term, {cache: false});
    }

    function getDesignCategoriesByBranding(branding) {
      return $http.get(baseUrl + '/studio/ideas/categories/' + branding, {cache: true});
    }

    function trackPageView(trackingData){
      return $http.post(baseUrl + '/studio/pageViews', trackingData);
    }

    function getItemCompatibles() {
      return $http.get(baseUrl + '/studio/products/compatibles', {cache: true}).then(function (response) {
        return response.data;
      });
    }

    function reminderEmail(trackingData){
      return $http.post(baseUrl + '/studio/analytics/track', trackingData).success(function(response){
        return response.data
      });
    }

    function getDTGSafeItems() {
      return $http.get(baseUrl + '/studio/products/dtgSafe', {cache: true}).then(function (response) {
        return response.data.filter(function (item) {
          return parseInt(item.active, 10) === 1;
        });
      });
    }

    function getPromoByCode(code){
      return $http.get(baseUrl + '/studio/promos/' + code).success(function(response){
        return response.data;
      });
    }

    function getItemById(id){
      return $http.get(baseUrl + '/studio/products/' + id).success(function(response){
        return response.data;
      });
    }

    function getValidPromoCodes(subTotal, quantity, items, promos){
      return $http.post(baseUrl + '/studio/promos', [parseFloat(subTotal), parseInt(quantity, 10), 0, items, promos]).then(function (response) {
        return response.data;
      });
    }

    function shareDesign(data){
      return $http.post(baseUrl + '/studio/design/share', data).success(function(response){
        return response;
      });
    }

    function isExistingDesign(data){
      return $http.post(baseUrl + '/studio/design/exists', data).then(function(response){
        return response.data !== false && response.data !== "false";
      });
    }

    function getDesignsByEmail(email) {
      var endpoint = baseUrl + '/studio/designs?filters[email]=' + email + '&filters[deletedflag]=0&limit=1000';

      return $http.get(endpoint).success(function(response){
        return response.data;
      });
    }

    function onDesignSuccess(data) {
      $rootScope.$broadcast("designLoadSuccess", data);
    }

    function onDesignError(data) {
      $rootScope.$broadcast("designLoadFailed", data);
    }
  }
})(angular);

(function(angular) {
  'use strict';

  angular.module('designstudioApp').factory('AWSService', ['$http', 'config', AWSService]);

  function AWSService($http, config) {
    var service = {
      isImageMostlyWhite: isImageMostlyWhite,
      mergeSimilarColors: mergeSimilarColors,
      getBackgroundColor: getBackgroundColor
    };

    return service;

    function isImageMostlyWhite(fileName) {
      var url = config.lambda.url + '/isImageMostlyWhite/?prefix=preview&file=' + fileName;

      return $http.get(url, {cache: true}).then(function (response) {
        return response.data;
      });
    }

    function mergeSimilarColors(fileName) {
      var url = config.lambda.url + '/mergeSimilarColors/?maxDelta=13&prefix=preview&file=' + fileName;

      return $http.get(url, {cache: true}).then(function (response) {
        return response.data;
      });
    }

    function getBackgroundColor(fileName) {
      var url = config.lambda.url + '/getBackgroundColor/?prefix=preview&file=' + fileName;

      return $http.get(url, {cache: true}).then(function (response) {
        return response.data;
      });
    }
  }
})(angular);

(function(angular) {
  'use strict';
  angular.module('designstudioApp').service('MinimumQuantity', [Service]);

  function Service() {
    var minQuantities = {};

    var service = {
      etl: etl,
      getBlank: getBlank,
      getByPrintMethod: getByPrintMethod

    };

    return service;

    function etl(configData) {
      minQuantities = configData.minQuantities;
    }

    function getBlank() {
      return minQuantities.blank;
    }

    function getByPrintMethod(code) {
      return angular.isDefined(minQuantities[code]) ? minQuantities[code] : 3;
    }
  }
})(angular);

angular.module('designstudioApp').directive('slider', function() {
    return {
        restrict: 'E',
        replace: true,
        scope: {
            ngModel: '=',
            id: '@',
            min: '@',
            max: '@',
            step: '@'
        },
        link: function(scope, element, attrs) {
            var sliderObj = $(element).slider({
                min: parseInt(scope.min),
                max: parseInt(scope.max),
                step: parseInt(scope.step),
                animate: true,
                id: scope.id,
                value: scope.ngModel
            });

            sliderObj.on("slide", function(slideEvt) {
                return scope.$apply(function(){
                    scope.ngModel = slideEvt.value;
                });
            });

            scope.$watch('ngModel', function(newValue) {
                newValue = (typeof newValue === 'undefined' || newValue < scope.min) ? scope.min : (newValue > scope.max) ? scope.max : newValue;
                sliderObj.slider('setValue', newValue);
            });
        }
    };
});