package com.projectcalendar.mobile.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.projectcalendar.mobile.R

/**
 * AppWidgetProvider for the 2×2 calendar home-screen widget.
 *
 * Responsibilities:
 *  - Inflate the widget layout (widget_layout.xml)
 *  - Set the click intent for the "+" (new event) button
 *  - Attach the RemoteViewsService adapter that populates the scrollable
 *    ListView with CalendarWidgetItemFactory rows
 *  - Handle ACTION_WIDGET_REFRESH broadcasts so React Native can trigger an
 *    immediate redraw after data changes
 */
class CalendarWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_WIDGET_REFRESH =
            "com.projectcalendar.mobile.widget.ACTION_WIDGET_REFRESH"

        /** Deep-link URI scheme used to open specific screens inside the app */
        private const val APP_SCHEME = "projectcalendar"
    }

    // ------------------------------------------------------------------
    // AppWidgetProvider callbacks
    // ------------------------------------------------------------------

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_WIDGET_REFRESH) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, CalendarWidgetProvider::class.java),
            )
            // Notify the RemoteViewsService that the data set has changed
            manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_list_view)
            // Also rebuild the top-level RemoteViews so the header refreshes
            for (id in ids) {
                updateWidget(context, manager, id)
            }
        }
    }

    // ------------------------------------------------------------------
    // Private helpers
    // ------------------------------------------------------------------

    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        widgetId: Int,
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_layout)

        // --- Header: tap opens the app at today's agenda view ---
        val openAppIntent = context.packageManager
            .getLaunchIntentForPackage(context.packageName)
            ?.apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP }
        val openAppPi = PendingIntent.getActivity(
            context,
            0,
            openAppIntent ?: Intent(),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        views.setOnClickPendingIntent(R.id.widget_header, openAppPi)

        // --- "+" button: open new-event screen ---
        val newEventUri = Uri.parse("$APP_SCHEME://new-event")
        val newEventIntent = Intent(Intent.ACTION_VIEW, newEventUri).apply {
            setPackage(context.packageName)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        val newEventPi = PendingIntent.getActivity(
            context,
            widgetId,
            newEventIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        views.setOnClickPendingIntent(R.id.widget_btn_add, newEventPi)

        // --- ListView: attach RemoteViewsService ---
        val serviceIntent = Intent(context, CalendarWidgetService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            // Use the widget ID as a unique URI so Android caches factories
            // separately per widget instance.
            data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
        }
        views.setRemoteAdapter(R.id.widget_list_view, serviceIntent)

        // --- Empty view when there are no upcoming events ---
        views.setEmptyView(R.id.widget_list_view, R.id.widget_empty_text)

        // --- Template for item click: opens the detail screen ---
        val itemClickTemplate = PendingIntent.getActivity(
            context,
            widgetId + 1000,
            Intent(Intent.ACTION_VIEW).apply {
                setPackage(context.packageName)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
        )
        views.setPendingIntentTemplate(R.id.widget_list_view, itemClickTemplate)

        appWidgetManager.updateAppWidget(widgetId, views)
    }
}
