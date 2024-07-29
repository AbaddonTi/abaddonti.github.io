# Custom Widget for Grist

This project showcases a custom widget designed for analyzing income and expenses over specified periods within a Grist table. The widget is built using JavaScript, CSS, and HTML, and can serve as an example for creators of custom widgets, demonstrating the capabilities of Grist combined with JavaScript.

## Features

- **Date Range Filtering:** Filter data by specifying start and end dates.
- **Team and Employee Selection:** Filter data by selecting a specific team or employee.
- **Summary Display:** View total profit, average spread, total volume, net income, and total expenses.
- **Detailed Expenses:** View detailed expense categories and toggle individual categories.
- **Interactive Chart:** Visualize profit over time with an interactive chart powered by Chart.js and supporting zoom and pan functionalities.

## Installation

To add this widget to your Grist table:

1. Open your Grist document.
2. Add a new custom widget.
3. Enter the following URL in the widget URL field:

```
https://abaddonti.github.io/
```

## Usage

### Filters

- **Date Range:** Use the datetime-local inputs to set the start and end dates for filtering the data.
- **Team Selection:** Choose a team from the dropdown to filter data by team.
- **Employee Selection:** Choose an employee from the dropdown to filter data by employee.

### Summary

The summary section displays the following information based on the filtered data:
- Total Profit
- Average Spread
- Total Volume
- Net Income
- Total Expenses

### Expenses

The expenses section provides detailed information about each expense category. You can toggle individual expense categories to include or exclude them from the analysis.

### Chart

The chart visualizes the profit over time. Use the interactive features to zoom and pan within the chart for a more detailed view.

## Code Overview

The widget is built using HTML for structure, CSS for styling, and JavaScript for functionality. Key components include:

- **HTML:** Defines the structure of the widget, including filters, summary, expenses, and chart sections.
- **CSS:** Provides styling for the widget, ensuring a clean and user-friendly interface.
- **JavaScript:** Handles data fetching, filtering, and visualization using Grist's API and Chart.js.
