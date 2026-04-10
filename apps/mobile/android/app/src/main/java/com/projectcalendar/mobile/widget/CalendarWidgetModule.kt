package com.projectcalendar.mobile.widget

import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class CalendarWidgetModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "CalendarWidgetModule"

    @ReactMethod
    fun refresh(promise: Promise) {
        try {
            val intent = Intent(CalendarWidgetProvider.ACTION_WIDGET_REFRESH).apply {
                setClass(reactApplicationContext, CalendarWidgetProvider::class.java)
                setPackage(reactApplicationContext.packageName)
            }
            reactApplicationContext.sendBroadcast(intent)
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("WIDGET_REFRESH_FAILED", error)
        }
    }
}
