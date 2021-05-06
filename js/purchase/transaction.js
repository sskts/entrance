$(function () {
    if (!isSupportBrowser()) {
        $('.not-recommended').show();
        $('.wrapper-inner').show();
        return;
    }
    var id = getParameter()['id'];
    var sellerId = getParameter()['sellerId'];
    if (id === undefined
        || sellerId === undefined) {
        showError('error');
        return;
    }
    var congestion = JSON.parse(sessionStorage.getItem('congestion'));
    if (congestion !== null
        && Date.now() < congestion.expired
        && sellerId === congestion.sellerId) {
        // 混雑期間内
        showError('congestion');
        return;
    }
    loadingStart();
    getToken(id, sellerId)
        .done(function (data) {
            var params = getParameter();
            if (params.redirectUrl === undefined
                || params.id === undefined) {
                showError('error');
                loadingEnd();
                return;
            }
            params.performanceId = params.id;
            params.passportToken = data.token;
            var query = toQueryString(params);
            var url = decodeURIComponent(params.redirectUrl) + '/purchase/transaction?' + query;
            // location.href = url;
            location.replace(url);
        })
        .fail(function (jqXhr, textStatus, error) {
            console.error(jqXhr, textStatus, error);
            var status = jqXhr.status;
            if (status === HTTP_STATUS.TOO_MANY_REQUESTS
                || status === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
                // 混雑エラー
                var expired = Date.now() + 10000;
                sessionStorage.setItem('congestion', JSON.stringify({
                    expired: expired,
                    sellerId: sellerId
                }));
                showError('congestion');
            } else if (status === HTTP_STATUS.SERVICE_UNAVAILABLE) {
                // メンテナンス
                showError('maintenance');
            } else {
                // アクセスエラー
                showError('error');
            }
            loadingEnd();
        });;
});

/**
 * エントランス取得
 */
function getEntranceRegExp() {
    return {
        development: /localhost|d2n1h4enbzumbc/i,
        test: /d24x7394fq3aqi/i,
        production: /https\:\/\/sskts\-waiter\-production\.appspot\.com/i
    };
}

/**
 * トークン取得
 * @param {string} id 
 * @param {string} sellerId 
 * @returns 
 */
function getToken(id, sellerId) {
    var url = createWaiterUrl();
    var scope = 'Transaction:PlaceOrder:' + sellerId;
    var scope = 'placeOrderTransaction.MovieTheater-' + id.slice(0, 3);
    var option = {
        dataType: 'json',
        url: url,
        type: 'POST',
        timeout: 10000,
        data: {
            scope: scope
        }
    };

    return $.ajax(option);
}

/**
 * ウエイターURL作成
 */
function createWaiterUrl() {
    var entrance = getEntranceRegExp();
    var env = (entrance.development.test(location.hostname))
        ? 'development'
        : (entrance.test.test(location.hostname))
            ? 'test'
            : 'production';
    var waiter = {
        development: 'https://waiter-development.appspot.com',
        test: 'https://waiter-test-224022.appspot.com',
        production: 'https://waiter-production.appspot.com'
    };
    var projectId = {
        development: 'sskts-development',
        test: 'sskts-test',
        production: 'sskts-production'
    };
    var url = waiter[env] + '/projects/' + projectId[env] + '/passports';

    return url;
}

/**
 * アクセスエラー表示
 * @param {string} errorType 
 */
function showError(errorType) {
    if (errorType === 'maintenance') {
        $('.maintenance').show();
    } else if (errorType === 'congestion') {
        $('.access-congestion').show();
    } else {
        $('.access-error').show();
    }
    $('.wrapper-inner').show();
}

/**
 * ブラウザ対応判定
 * @function isSupportBrowser
 * @returns {boolean}
 */
function isSupportBrowser() {
    var result = true;
    var userAgent = window.navigator.userAgent.toLowerCase();
    var version = window.navigator.appVersion.toLowerCase();
    if (userAgent.indexOf('msie') > -1) {
        if (version.indexOf('msie 6.') > -1) {
            result = false;
        } else if (version.indexOf('msie 7.') > -1) {
            result = false;
        } else if (version.indexOf('msie 8.') > -1) {
            result = false;
        } else if (version.indexOf('msie 9.') > -1) {
            result = false;
        }
    }
    return result;
}

/**
 * ローディングスタート
 * @function loadingStart
 * @param {function} cb
 * @returns {void}
 */
function loadingStart(cb) {
    $('.loading-cover').addClass('active');
    $('.loading').addClass('active');
    $('.wrapper').addClass('blur');
    setTimeout(function () {
        if (cb) cb();
    }, 1000);
}


/**
 * アプリ判定
 * @function isApp
 * @returns {boolean} 
 */
function isApp() {
    return $('body').hasClass('app');
}

/**
 * 券売機判定
 * @function isFixed
 * @returns {boolean} 
 */
function isFixed() {
    return $('body').hasClass('fixed');
}

/**
 * ローディングエンド
 * @function loadingEnd
 * @returns {void}
 */
function loadingEnd() {
    $('.loading-cover').removeClass('active');
    $('.loading').removeClass('active');
    $('.wrapper').removeClass('blur');
}

/**
 * パラメーター取得
 * @returns {any}
 */
function getParameter() {
    var result = {};
    var params = location.search.replace('?', '').split('&');
    var transactionId = null;
    for (var i = 0; i < params.length; i++) {
        var param = params[i].split('=');
        var key = param[0];
        var value = param[1];
        if (key && value) {
            result[key] = value;
        }
    }
    return result;
}

/**
 * クエリ変換
 * @param {Object} obj 
 */
function toQueryString(obj) {
    var keys = Object.keys(obj);
    var query = "";
    for (var i = 0; i < keys.length; i++) {
        query += keys[i] + "=" + encodeURIComponent(obj[keys[i]]);
        if (i != keys.length - 1) query += "&";
    }
    return query;
};

/**
 * IE判定
 */
function isIE() {
    var result = false;
    var userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.match(/(msie|MSIE)/) || userAgent.match(/(T|t)rident/)) {
        result = true;
        var ieVersion = userAgent.match(/((msie|MSIE)\s|rv:)([\d\.]+)/)[3];
        ieVersion = parseInt(ieVersion);
    }
}

/**
 * ステータスコード
 * @var HTTP_STATUS
 */
var HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};
window.HTTP_STATUS = HTTP_STATUS;