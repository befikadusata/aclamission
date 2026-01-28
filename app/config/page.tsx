import EnvConfig from "@/components/env-config"

export default function ConfigPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Environment Configuration</h1>
          <p className="text-gray-600">Configure your environment variables for ACLA Missions</p>
        </div>
        <EnvConfig />
      </div>
    </div>
  )
}
