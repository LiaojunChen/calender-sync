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
import java.util.Calendar

class CalendarWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_WIDGET_REFRESH =
            "com.projectcalendar.mobile.widget.ACTION_WIDGET_REFRESH"

        private const val APP_SCHEME = "projectcalendar"
        private val WEEKDAY_LABELS = arrayOf("周日", "周一", "周二", "周三", "周四", "周五", "周六")
    }

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
            manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_list_view)
            for (id in ids) {
                updateWidget(context, manager, id)
            }
        }
    }

    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        widgetId: Int,
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_layout)
        bindHeaderDate(views)

        val openAgendaIntent = Intent(
            Intent.ACTION_VIEW,
            Uri.parse("$APP_SCHEME://agenda/today"),
        ).apply {
            setPackage(context.packageName)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val openAgendaPi = PendingIntent.getActivity(
            context,
            0,
            openAgendaIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        views.setOnClickPendingIntent(R.id.widget_header, openAgendaPi)

        val newEventIntent = Intent(
            Intent.ACTION_VIEW,
            Uri.parse("$APP_SCHEME://new-event"),
        ).apply {
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

        val serviceIntent = Intent(context, CalendarWidgetService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
        }
        views.setRemoteAdapter(R.id.widget_list_view, serviceIntent)
        views.setEmptyView(R.id.widget_list_view, R.id.widget_empty_text)

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

    private fun bindHeaderDate(views: RemoteViews) {
        val today = Calendar.getInstance()
        val dayNumber = today.get(Calendar.DAY_OF_MONTH)
        val weekday = WEEKDAY_LABELS[today.get(Calendar.DAY_OF_WEEK) - 1]
        val month = today.get(Calendar.MONTH) + 1

        views.setTextViewText(R.id.widget_day_number, dayNumber.toString())
        views.setTextViewText(R.id.widget_weekday, weekday)
        views.setTextViewText(R.id.widget_month, "${month}月")
    }
}
