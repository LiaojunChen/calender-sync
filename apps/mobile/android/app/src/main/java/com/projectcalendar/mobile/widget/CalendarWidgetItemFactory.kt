package com.projectcalendar.mobile.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.net.Uri
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.projectcalendar.mobile.R
import org.json.JSONArray
import java.io.File

class CalendarWidgetItemFactory(
    private val context: Context,
    intent: Intent,
) : RemoteViewsService.RemoteViewsFactory {

    companion object {
        private const val WIDGET_DATA_FILENAME = "widget_data.json"
        private const val APP_SCHEME = "projectcalendar"
        private const val TEXT_COLOR_DARK_MODE = 0xFFEEEEEE.toInt()
        private const val TEXT_COLOR_LIGHT_MODE = 0xFF212121.toInt()
        private const val TIME_COLOR_DARK_MODE = 0xFFAAAAAA.toInt()
        private const val TIME_COLOR_LIGHT_MODE = 0xFF757575.toInt()
    }

    private val widgetId: Int =
        intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID,
        )

    private val rows = mutableListOf<Row>()

    private sealed class Row {
        data class DateHeader(val label: String) : Row()
        data class EventRow(
            val id: String,
            val title: String,
            val timeText: String,
            val color: String,
        ) : Row()

        data class TodoRow(
            val id: String,
            val title: String,
            val timeText: String,
            val color: String,
        ) : Row()
    }

    override fun onCreate() {
        loadData()
    }

    override fun onDataSetChanged() {
        loadData()
    }

    override fun onDestroy() {
        rows.clear()
    }

    override fun getCount(): Int = rows.size

    override fun getViewTypeCount(): Int = 3

    override fun getItemId(position: Int): Long = position.toLong()

    override fun hasStableIds(): Boolean = false

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewAt(position: Int): RemoteViews {
        val isDarkMode = (context.resources.configuration.uiMode and
            Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

        val textColor = if (isDarkMode) TEXT_COLOR_DARK_MODE else TEXT_COLOR_LIGHT_MODE
        val timeColor = if (isDarkMode) TIME_COLOR_DARK_MODE else TIME_COLOR_LIGHT_MODE

        return when (val row = rows.getOrNull(position)) {
            is Row.DateHeader -> buildDateHeaderView(row, textColor)
            is Row.EventRow -> buildEventView(row, textColor, timeColor)
            is Row.TodoRow -> buildTodoView(row, textColor, timeColor)
            null -> RemoteViews(context.packageName, R.layout.widget_item_event)
        }
    }

    private fun buildDateHeaderView(row: Row.DateHeader, textColor: Int): RemoteViews {
        return RemoteViews(context.packageName, R.layout.widget_item_date).apply {
            setTextViewText(R.id.item_date_label, row.label)
            setTextColor(R.id.item_date_label, textColor)
        }
    }

    private fun buildEventView(row: Row.EventRow, textColor: Int, timeColor: Int): RemoteViews {
        return RemoteViews(context.packageName, R.layout.widget_item_event).apply {
            setInt(R.id.item_event_color_bar, "setBackgroundColor", parseColor(row.color))
            setTextViewText(R.id.item_event_title, row.title)
            setTextColor(R.id.item_event_title, textColor)
            setTextViewText(R.id.item_event_time, row.timeText)
            setTextColor(R.id.item_event_time, timeColor)
            setOnClickFillInIntent(
                R.id.item_event_root,
                Intent(Intent.ACTION_VIEW).apply {
                    data = Uri.parse("$APP_SCHEME://event/${row.id}")
                },
            )
        }
    }

    private fun buildTodoView(row: Row.TodoRow, textColor: Int, timeColor: Int): RemoteViews {
        return RemoteViews(context.packageName, R.layout.widget_item_todo).apply {
            setInt(R.id.item_todo_color_bar, "setBackgroundColor", parseColor(row.color))
            setTextViewText(R.id.item_todo_title, row.title)
            setTextColor(R.id.item_todo_title, textColor)
            setTextViewText(R.id.item_todo_time, row.timeText)
            setTextColor(R.id.item_todo_time, timeColor)
            setOnClickFillInIntent(
                R.id.item_todo_root,
                Intent(Intent.ACTION_VIEW).apply {
                    data = Uri.parse("$APP_SCHEME://todo/${row.id}")
                },
            )
        }
    }

    private fun loadData() {
        rows.clear()
        try {
            val json = readWidgetFile() ?: return
            val groups = JSONArray(json)
            for (i in 0 until groups.length()) {
                val group = groups.getJSONObject(i)
                val label = group.optString("label", group.optString("date", ""))
                rows.add(Row.DateHeader(label))

                val items = group.optJSONArray("items") ?: continue
                for (j in 0 until items.length()) {
                    val item = items.getJSONObject(j)
                    val id = item.optString("id", "")
                    val type = item.optString("type", "event")
                    val title = item.optString("title", "(no title)")
                    val timeText = item.optString("timeText", "")
                    val color = item.optString("color", "#4A90E2")

                    if (type == "todo") {
                        rows.add(Row.TodoRow(id, title, timeText, color))
                    } else {
                        rows.add(Row.EventRow(id, title, timeText, color))
                    }
                }
            }
        } catch (_: Exception) {
            rows.clear()
        }
    }

    private fun readWidgetFile(): String? {
        val candidates = mutableListOf<File>()
        val expoDirRoot = File(context.filesDir, "ExponentExperienceData")
        if (expoDirRoot.exists()) {
            expoDirRoot.listFiles()?.forEach { expDir ->
                candidates.add(File(expDir, WIDGET_DATA_FILENAME))
            }
        }

        candidates.add(File(context.filesDir, WIDGET_DATA_FILENAME))

        for (file in candidates) {
            if (file.exists() && file.canRead()) {
                return file.readText(Charsets.UTF_8)
            }
        }
        return null
    }

    private fun parseColor(hex: String): Int {
        return try {
            Color.parseColor(hex)
        } catch (_: IllegalArgumentException) {
            Color.parseColor("#4A90E2")
        }
    }
}
