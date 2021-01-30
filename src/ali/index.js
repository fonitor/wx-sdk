
import util from '../util/index'

export default class BaseMonitor {
    constructor() {
        this._conf = {
            baseUrl: '',
            autoReportApi: true, // 是否上报api 
            autoReportPage: true, // 是否上报页面信息
            autoReportPagePerformance: true, // 是否上报页面性能
        }
    }

    /**
     * 监控注册
     * @param {*} e 
     */
    hookApp(e) {
        let self = this,
            t = {
                onError: function (t) {
                    let n = 1 === arguments.length ? [arguments[0]] : Array.apply(null, arguments),
                        r = e.onError;
                    try {
                        self.error(t)
                    } catch (t) {
                        util.warn("[cloudMonitor] error in hookApp:onError", t)
                    }
                    if ("function" == typeof r) {
                        return r.apply(this, n)
                    }
                }
            }

        return util.ext({}, e, t)
    }

    /**
     * 监控执行
     * @param {*} options 
     */
    init(options) {
        if (!options || !options.pid) {
            util.warn("[cloudMonitor] not set pid");
            return
        }
        let self = this
        try {
            this.setConfig({}, function() {
                self.addHook()
                // 是否需要落pv数据
                if (self && self._conf && self._conf.autoReportPage) {
                    self.onReady(() => {
                        self._log('pv')
                    })
                }
            })
        } catch (err) {
            util.warn("[cloudMonitor] set config error");
        }


    }

    /**
     * @param {*} fun 
     */
    onReady(fun) {
        if (typeof fun != 'function') {
            util.warn('[cloudMonitor] not function')
            return
        }
        this._conf.uid ? fun() : setTimeout(() => {
            this.onReady(fun)
        }, 100)
    }

    /**
     * 错误信息
     * @param {*} t 
     * @param {*} e 
     */
    error(t, e) {
        if (!t) {
            return util_1.warn("[cloudMonitor] invalid param e: " + t), this
        }
        1 === arguments.length ? ("string" == typeof t && (t = {
            message: t
        }, e = {}), "object" == typeof t && (e = t = t.error || t)) : ("string" == typeof t && (t = {
            message: t
        }), "object" != typeof e && (e = {}));
        let name = t.name || 'CustomError'
        let useData = {
            begin: Date.now(),
            cate: name,
            msg: t.message,
            file: e.filename || "",
            line: e.lineno || "",
            col: e.colno || "",
        }

    }

    getConfig(e) {
        return {}
        // return e ? this._conf[e] : util.ext({}, this._conf)
    }

    /**
     * 初始化参数
     * @param {*} options
     * @param {*} fun 
     */
    setConfig(options, fun) {
        this.initQueue()
        fun()
    }

    initQueue() { }

    /**
     * 执行log 存储
     * @param {*} type 
     */
    _log(type) {
        switch (type) {
            case 'pv':
                this._logPv()
                break
            default:

        }
    }

    /**
     * pv 数据
     */
    _logPv() {

    }

    /**
     * 代理
     */
    addHook() {

    }
}