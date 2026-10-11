<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\SalesReport;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Options;
use OpenSpout\Writer\XLSX\Writer;

class SalesController extends Controller
{
    // GET /api/admin/sales?period=week&date=2026-10-11
    public function index(Request $request)
    {
        return $this->report($request)->build();
    }

    // GET /api/admin/sales/export?period=week&date=2026-10-11 → an Excel (.xlsx) file
    public function export(Request $request)
    {
        $report = $this->report($request);
        $data = $report->build();
        $orders = $report->orders();
        $bold = new Style(fontBold: true);
        $title = new Style(fontBold: true, fontSize: 14);

        return response()->streamDownload(function () use ($report, $data, $orders, $bold, $title) {
            $writer = new Writer(new Options(DEFAULT_COLUMN_WIDTH: 20));
            $writer->openToFile('php://output');   // write straight into the download

            // Sheet 1: Summary
            $writer->getCurrentSheet()->setName('Summary');
            $s = $data['summary'];
            $writer->addRow(Row::fromValuesWithStyle(['Yummiii sales report'], $title));
            $writer->addRows([
                Row::fromValues(['Period', ucfirst($data['period']).': '.$data['label']]),
                Row::fromValues(['From', $data['start']]),
                Row::fromValues(['To', $data['end']]),
                Row::fromValues([]),
                Row::fromValuesWithStyle(['Figure', 'Value'], $bold),
                Row::fromValues(['Orders', $s['orders']]),
                Row::fromValues(['Items sold', $s['items_sold']]),
                Row::fromValues(['Sales total (Rs.)', $s['sales_total']]),
                Row::fromValues(['Cash collected (Rs.)', $s['cash_collected']]),
                Row::fromValues(['Cash still to collect (Rs.)', $s['cash_to_collect']]),
                Row::fromValues(['Average order (Rs.)', $s['average_order']]),
                Row::fromValues(['Cancelled orders (not counted)', $s['cancelled_orders']]),
            ]);

            // Sheet 2: Orders (every order, cancelled ones included and marked)
            $writer->addNewSheetAndMakeItCurrent()->setName('Orders');
            $writer->addRow(Row::fromValuesWithStyle(
                ['Order', 'Date', 'Customer', 'Phone', 'Area', 'Status', 'Items', 'Subtotal (Rs.)', 'Delivery (Rs.)', 'Total (Rs.)'], $bold));
            foreach ($orders as $order) {
                $writer->addRow(Row::fromValues([
                    $order->order_number,
                    $order->created_at->setTimezone(SalesReport::TIMEZONE)->format('Y-m-d H:i'),
                    $order->customer_name,
                    $order->phone,
                    $order->delivery_area,
                    SalesReport::STATUS_LABELS[$order->status] ?? $order->status,
                    (int) $order->items->sum('quantity'),
                    $order->subtotal,
                    $order->delivery_fee,
                    $order->total,
                ]));
            }

            // Sheet 3: Products (best sellers in this period)
            $writer->addNewSheetAndMakeItCurrent()->setName('Products');
            $writer->addRow(Row::fromValuesWithStyle(['Product', 'Quantity sold', 'Sales (Rs.)'], $bold));
            foreach ($data['products'] as $product) {
                $writer->addRow(Row::fromValues([$product['name'], $product['quantity'], $product['sales']]));
            }

            // Sheet 4: Order items (one line per product per order)
            $writer->addNewSheetAndMakeItCurrent()->setName('Order items');
            $writer->addRow(Row::fromValuesWithStyle(
                ['Order', 'Date', 'Status', 'Product', 'Price (Rs.)', 'Quantity', 'Line total (Rs.)'], $bold));
            foreach ($orders as $order) {
                foreach ($order->items as $item) {
                    $writer->addRow(Row::fromValues([
                        $order->order_number,
                        $order->created_at->setTimezone(SalesReport::TIMEZONE)->format('Y-m-d H:i'),
                        SalesReport::STATUS_LABELS[$order->status] ?? $order->status,
                        $item->product_name,
                        $item->price,
                        $item->quantity,
                        $item->line_total,
                    ]));
                }
            }

            $writer->close();
        }, $report->fileName(), [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function report(Request $request): SalesReport
    {
        $data = $request->validate([
            'period' => ['required', Rule::in(SalesReport::PERIODS)],
            'date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        return new SalesReport($data['period'], $data['date'] ?? null);
    }
}
