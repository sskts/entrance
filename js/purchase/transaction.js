$(function () {
    if (!isSupportBrowser()) {
        $('.not-recommended').show();
        $('.wrapper-inner').show();
        return;
    }
    getToken();
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
 * @function getToken
 * @returns {void}
 */
function getToken() {
    var performanceId = getParameter()['id'];
    if (performanceId === undefined) {
        showAccessError();
        return;
    }
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
    var scope = 'placeOrderTransaction.MovieTheater-' + performanceId.slice(0, 3);
    var option = {
        dataType: 'json',
        url: url,
        type: 'POST',
        timeout: 10000,
        data: {
            scope: scope
        }
    };
    var expired = Date.now() + 60000;
    var congestion = JSON.parse(sessionStorage.getItem('congestion'));
    if (congestion !== null && Date.now() < congestion.expired && scope === congestion.scope) {
        // 混雑期間内
        showAccessCongestionError();
        return;
    }
    var prosess = function (data, jqXhr) {
        if (jqXhr.status === HTTP_STATUS.CREATED) {
            redirectToTransaction({ passportToken: data.token });
        } else if (jqXhr.status === HTTP_STATUS.BAD_REQUEST
            || jqXhr.status === HTTP_STATUS.NOT_FOUND) {
            // アクセスエラー
            showAccessError();
            loadingEnd();
        } else if (jqXhr.status === HTTP_STATUS.TOO_MANY_REQUESTS
            || jqXhr.status === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
            // 混雑エラー
            sessionStorage.setItem('congestion', JSON.stringify({
                expired: expired,
                scope: scope
            }));
            showAccessCongestionError();
            loadingEnd();
        } else if (jqXhr.status === HTTP_STATUS.SERVICE_UNAVAILABLE) {
            // メンテナンス
            showMaintenance();
            loadingEnd();
        }
    }

    var doneFunction = function (data, textStatus, jqXhr) {
        prosess(data, jqXhr);
    };
    var failFunction = function (jqXhr, textStatus, error) {
        prosess(null, jqXhr);
    };
    loadingStart();
    $.ajax(option)
        .done(doneFunction)
        .fail(failFunction);
}

/**
 * 取引取得
 * @param {Object} args
 * @param {string} args.passportToken
 * @returns {void}
 */
function redirectToTransaction(args) {
    var entrance = getEntranceRegExp();
    var frontend = {
        development: 'https://sskts-frontend-development.azurewebsites.net',
        test: 'https://sskts-frontend-test.azurewebsites.net',
        production: 'https://ticket-cinemasunshine.com'
    }
    var frontendStaging = {
        development: 'https://sskts-frontend-development-staging.azurewebsites.net',
        test: 'https://sskts-frontend-test-staging.azurewebsites.net',
        production: 'https://prodssktsfrontend-staging.azurewebsites.net'
    }
    var frontendFixed = {
        development: 'https://sskts-frontend-fixed-development.azurewebsites.net',
        test: 'https://sskts-frontend-fixed-test.azurewebsites.net',
        production: 'https://machine.ticket-cinemasunshine.com'
    }
    var frontendFixedStaging = {
        development: 'https://sskts-frontend-fixed-development-staging.azurewebsites.net',
        test: 'https://sskts-frontend-fixed-test-staging.azurewebsites.net',
        production: 'https://sskts-frontend-fixed-production-staging.azurewebsites.net'
    }
    var domain = (isFixed()) ? frontendFixed : frontend;
    if (getParameter()['staging'] !== undefined
        && getParameter()['staging']) {
        domain = (isFixed()) ? frontendFixedStaging : frontendStaging;
    }

    var endPoint = (entrance.development.test(location.hostname))
        ? domain.development
        : (entrance.test.test(location.hostname))
            ? domain.test
            : domain.production;

    if (/localhost/i.test(document.referrer)) {
        if (isIE()) {
            endPoint = 'https://localhost';
        } else {
            endPoint = (isApp()) ? 'https://localhost' : new URL(document.referrer).origin;
        }
    }

    var params = getParameter();
    params.performanceId = getParameter()['id'];
    params.passportToken = args.passportToken;
    var query = toQueryString(params);

    var url = endPoint + '/purchase/transaction?' + query;
    location.replace(url);
}

/**
 * メンテナンス表示
 * @function showMaintenance
 * @returns {void}
 */
function showMaintenance() {
    $('.maintenance').show();
    $('.wrapper-inner').show();
}

/**
 * アクセスエラー表示
 * @function showAccessError
 * @returns {void}
 */
function showAccessError() {
    $('.access-error').show();
    $('.wrapper-inner').show();
}

/**
 * アクセス混雑エラー表示
 * @function showAccessCongestionError
 * @returns {void}
 */
function showAccessCongestionError() {
    $('.access-congestion').show();
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