import { getPage } from './util'


const HandleWxAppEvents = {
    onError(e) {
        try {
            if (!this.wxMonitor) return
            let vm = this.wxMonitor
            let data = {
                simpleUrl: getPage(),
                errorMessage: String(e)
            }
            vm.logSave('js_error', data)
        } catch (e) { }
    }
}

const HandleWxPageEvents = {
    onLoad() {
        try {
            if (!this.wxMonitor) return
            let vm = this.wxMonitor,
                toUrl = getPage()
            let data = {
                simpleUrl: toUrl,
                referrer: vm.referrerPage || "",
            }
            vm.logSave('page_pv', data)
            vm.referrerPage = toUrl
        } catch (e) { }
    }
}

export { HandleWxAppEvents, HandleWxPageEvents }