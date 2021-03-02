import { HandleEvents } from './HandleEvents'
import { on, replaceOld, isExistProperty, throttle, variableTypeDetection, getTimestamp } from '../util/help'
import { subscribeEvent, triggerHandlers } from '../conmmon/subscribe'
import * as webConfig from '../config/web'
import { getLocationHref, supportsHistory, htmlElementAsString } from './util'

/**
 * 添加方法
 * @param {*} handler 
 */
export function addReplaceHandler(handler) {
    subscribeEvent(handler)
}

/**
 * http 请求监控
 */
export function replaceNetwork() {
    if (!('XMLHttpRequest' in window)) {
        return
    }
    addReplaceHandler({
        callback: (data) => {
            HandleEvents.handleHttp(data)
        },
        type: webConfig.XHR
    })
    const originalXhrProto = XMLHttpRequest.prototype
    replaceOld(
        originalXhrProto,
        'open',
        (originalOpen) => {
            return function (...args) {
                this.mito_xhr = {
                    method: variableTypeDetection.isString(args[0]) ? args[0].toUpperCase() : args[0],
                    url: args[1] || "",
                    type: webConfig.XHR,
                    startTime: getTimestamp()
                }
                originalOpen.apply(this, args)
            }
        }
    )
    replaceOld(
        originalXhrProto,
        'send',
        function (originalSend) {
            return function (...args) {

                on(this, 'loadend', function () {
                    try {
                        const { responseType, response, status } = this
                        this.mito_xhr.reqData = args[0]
                        const eTime = getTimestamp()
                        this.mito_xhr.time = eTime
                        this.mito_xhr.status = status
                        if (['', 'json', 'text'].indexOf(responseType) !== -1) {
                            this.mito_xhr.responseText = typeof response === 'object' ? JSON.stringify(response) : response
                        }
                        this.mito_xhr.elapsedTime = eTime - this.mito_xhr.startTime
                        triggerHandlers(webConfig.XHR, this.mito_xhr)
                    } catch (e) { }
                })
                originalSend.apply(this, args)
            }
        }
    )

}

/**
 * 处理fetch请求
 */
export function replaceFetch() {
    if (!('fetch' in window)) {
        return
    }
    replaceOld(window, webConfig.FETCH, (originalFetch) => {
        return function (url, config) {
            const sTime = getTimestamp()
            const method = (config && config.method) || 'GET'
            let handlerData = {
                type: webConfig.FETCH,
                method,
                reqData: config && config.body,
                url
            }
            const headers = new Headers(config.headers || {})
            Object.assign(headers, {
                setRequestHeader: headers.set
            })
            config = {
                ...config,
                headers
            }
            return originalFetch.apply(window, [url, config]).then(res => {
                const tempRes = res.clone()
                const eTime = getTimestamp()
                handlerData = {
                    ...handlerData,
                    elapsedTime: eTime - sTime,
                    status: tempRes.status,
                    // statusText: tempRes.statusText,
                    time: eTime
                }
                tempRes.text().then((data) => {
                    if (method === EMethods.Post && transportData.isSdkTransportUrl(url)) return
                    if (isFilterHttpUrl(url)) return
                    handlerData.responseText = tempRes.status > 401 && data
                    triggerHandlers(webConfig.FETCH, handlerData)
                })
                return res
            }, err => {
                const eTime = getTimestamp()
                if (method === EMethods.Post && transportData.isSdkTransportUrl(url)) return
                if (isFilterHttpUrl(url)) return
                handlerData = {
                    ...handlerData,
                    elapsedTime: eTime - sTime,
                    status: 0,
                    // statusText: err.name + err.message,
                    time: eTime
                }
                triggerHandlers(webConfig.FETCH, handlerData)
                throw err
            })
        }
    })
}

/**
 * 错误监控
 */
export function replaceError() {
    // 先添加方法到数组
    addReplaceHandler({
        callback: (error) => {
            HandleEvents.handleError(error)
        },
        type: webConfig.PAGE_JS_ERROR
    })
    on(
        window,
        webConfig.PAGE_JS_ERROR,
        function (e) {
            triggerHandlers(webConfig.PAGE_JS_ERROR, e)
        },
        true
    )
}

// 上一次的路由
let lastHref
lastHref = getLocationHref()

// hashchange
export function listenHashchange() {
    addReplaceHandler({
        callback: (e) => {
            HandleEvents.handleHashchange(e)
        },
        type: webConfig.HASHCHANGE
    })
    if (!isExistProperty(window, 'onpopstate')) {
        on(window, webConfig.HASHCHANGE, function (e) {
            triggerHandlers(webConfig.HASHCHANGE, e)
        })
    }
}

// history
export function historyReplace() {
    // 先添加方法到数组
    addReplaceHandler({
        callback: (data) => {
            HandleEvents.handleHistory(data)
        },
        type: webConfig.HISTORY
    })
    if (!supportsHistory()) return
    const oldOnpopstate = window.onpopstate
    window.onpopstate = function (...args) {
        const to = getLocationHref()
        const from = lastHref
        triggerHandlers(webConfig.HISTORY, {
            from,
            to
        })
        oldOnpopstate && oldOnpopstate.apply(this, args)
    }
    function historyReplaceFn(originalHistoryFn) {
        return function (...args) {
            const url = args.length > 2 ? args[2] : undefined
            if (url) {
                const from = lastHref
                const to = String(url)
                lastHref = to
                triggerHandlers(webConfig.HISTORY, {
                    from,
                    to
                })
            }
            return originalHistoryFn.apply(this, args)
        }
    }
    replaceOld(window.history, 'pushState', historyReplaceFn)
    replaceOld(window.history, 'replaceState', historyReplaceFn)
}

const clickThrottle = throttle(triggerHandlers, 600)

// 页面点击
export function domReplace() {
    if (!('document' in window)) return
    addReplaceHandler({
        callback: (data) => {
            const htmlString = htmlElementAsString(data.data.srcElement)
            if (htmlString) {

            }
        },
        type: webConfig.DOM
    })
    on(
        window.document,
        'click',
        function (e) {
            clickThrottle(webConfig.DOM, {
                category: 'click',
                data: e
            })
        },
        true
    )
    // 暂时不需要keypress的重写
    // on(
    //   window.document,
    //   'keypress',
    //   function (e) {
    //     keypressThrottle('dom', {
    //       category: 'keypress',
    //       data: this
    //     })
    //   },
    //   true
    // )
}

// Promise
export function unhandledrejectionReplace() {
    addReplaceHandler({
        callback: (data) => {
            HandleEvents.handleUnhandleRejection(data)
        },
        type: webConfig.UNHANDLEDREJECTION
    })
    on(window, webConfig.UNHANDLEDREJECTION, function (ev) {
        // ev.preventDefault() 阻止默认行为后，控制台就不会再报红色错误
        triggerHandlers(webConfig.UNHANDLEDREJECTION, ev)
    })
}