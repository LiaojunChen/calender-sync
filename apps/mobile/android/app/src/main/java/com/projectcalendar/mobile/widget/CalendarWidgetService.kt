package com.projectcalendar.mobile.widget

import android.content.Intent
import android.widget.RemoteViewsService

/**
 * RemoteViewsService that provides the factory which populates the
 * scrollable ListView inside the calendar home-screen widget.
 */
class CalendarWidgetService : RemoteViewsService() {

    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return CalendarWidgetItemFactory(applicationContext, intent)
    }
}
