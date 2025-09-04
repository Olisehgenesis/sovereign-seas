export default function EmbedIndex() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md mx-auto rounded-xl shadow-lg border border-gray-200 p-6 bg-white text-center">
        <h1 className="text-2xl font-bold mb-4">Embeddable Voting Widgets</h1>
        <p className="mb-4 text-gray-700">Use the following endpoints to embed voting widgets on your site:</p>
        <div className="text-left space-y-2">
          <div>
            <span className="font-semibold">Single Project Vote:</span><br />
            <code className="bg-gray-100 px-2 py-1 rounded">/embed/&lt;campaignid&gt;/&lt;projectid&gt;</code>
          </div>
          <div>
            <span className="font-semibold">Campaign Project List:</span><br />
            <code className="bg-gray-100 px-2 py-1 rounded">/embed/campaign/&lt;campaignid&gt;</code>
          </div>
        </div>
        <div className="mt-6 text-xs text-gray-400">No header or footer is included in these widgets. Mobile responsive.</div>
      </div>
    </div>
  );
} 