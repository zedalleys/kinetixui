import XCTest
@testable import KinetixUI

@MainActor
final class ToasterCancellationTests: XCTestCase {
    func testSameMessageNewToastHasDistinctPresentationIdentity() {
        let original = KinetixToast("Saved", intent: .success)
        let copiedValue = original
        let replacement = KinetixToast("Saved", intent: .success)

        XCTAssertEqual(original.presentationID, copiedValue.presentationID)
        XCTAssertNotEqual(original.presentationID, replacement.presentationID)
    }

    func testCancelledDismissalPreservesReplacement() async {
        var currentMessage: String? = "Original"
        let (started, signal) = AsyncStream<Void>.makeStream()
        let dismissal = Task {
            signal.yield(())
            signal.finish()
            await KinetixToaster.dismissAfterDelay(60) { currentMessage = nil }
        }

        var readiness = started.makeAsyncIterator()
        _ = await readiness.next()
        currentMessage = "Replacement"
        dismissal.cancel()
        await dismissal.value

        XCTAssertEqual(currentMessage, "Replacement")
    }

    func testElapsedDismissalRunsCallback() async {
        var dismissed = false
        await KinetixToaster.dismissAfterDelay(0) { dismissed = true }
        XCTAssertTrue(dismissed)
    }
}
