/**
 * Google Sheets > Extensions > Apps Script에 붙여 넣으세요.
 *
 * 시트 이름: events
 * 첫 행 컬럼:
 * id | title | summary | brand | category | image | startDate | endDate | url | featured | published
 */
function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("events");
  if (!sheet) {
    return jsonResponse({ updatedAt: new Date().toISOString(), events: [] });
  }

  const values = sheet.getDataRange().getDisplayValues();
  const headers = values.shift();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = values
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])))
    .filter((event) => String(event.published).toLowerCase() === "true")
    .filter((event) => {
      if (!event.endDate) return true;
      const endDate = new Date(`${event.endDate}T23:59:59`);
      return endDate >= today;
    })
    .map((event) => ({
      id: event.id,
      title: event.title,
      summary: event.summary,
      brand: event.brand,
      category: event.category,
      image: event.image,
      startDate: event.startDate,
      endDate: event.endDate,
      url: event.url,
      featured: String(event.featured).toLowerCase() === "true",
    }));

  return jsonResponse({
    updatedAt: new Date().toISOString(),
    events,
  });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
