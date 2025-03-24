// components/FundDistributionTable.jsx
import { Award, PieChart, Users, ChevronUp, Info } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  voteCount: number;
  fundsReceived: number;
}

interface FundDistributionTableProps {
  distributionSummary: { name: string; amount: number }[];
  sortedByFundsProjects: Project[];
  totalFunds: number;
  campaignId: string;
  formatTokenAmount: (amount: bigint) => string;
  setDistributionTableVisible: (visible: boolean) => void;
}

const FundDistributionTable: React.FC<FundDistributionTableProps> = ({
  distributionSummary,
  sortedByFundsProjects,
  totalFunds,
  campaignId,
  formatTokenAmount,
  setDistributionTableVisible
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-md">
      <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center tilt-neon">
          <Award className="h-5 w-5 mr-2 text-emerald-500" />
          Fund Distribution Results
        </h2>
        <button
          onClick={() => setDistributionTableVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      </div>
      
      <div className="p-6 bg-gray-50">
        <h3 className="text-base font-medium mb-4 text-emerald-700 flex items-center">
          <PieChart className="h-4 w-4 mr-2" />
          Distribution Summary
        </h3>
        
        <div className="overflow-x-auto mb-6 bg-white rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-3 text-left text-gray-600 font-medium">Category</th>
                <th className="py-2 px-3 text-right text-gray-600 font-medium">Amount (CELO)</th>
                <th className="py-2 px-3 text-right text-gray-600 font-medium">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {distributionSummary.map((item, index) => (
                <tr key={index} className={index !== distributionSummary.length - 1 ? "border-b border-gray-100" : ""}>
                  <td className="py-2 px-3 text-left text-gray-800">{item.name}</td>
                  <td className="py-2 px-3 text-right text-gray-800">{item.amount}</td>
                  <td className="py-2 px-3 text-right text-gray-800">
                    {(Number(item.amount) / Number(totalFunds) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="py-2 px-3 text-left font-semibold text-gray-800">Total</td>
                <td className="py-2 px-3 text-right font-semibold text-gray-800">{totalFunds}</td>
                <td className="py-2 px-3 text-right font-semibold text-gray-800">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <h3 className="text-base font-medium mb-4 mt-6 text-emerald-700 flex items-center">
          <Users className="h-4 w-4 mr-2" />
          Project Distributions
        </h3>
        
        {sortedByFundsProjects.length > 0 ? (
          <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 px-3 text-left text-gray-600 font-medium">Rank</th>
                  <th className="py-2 px-3 text-left text-gray-600 font-medium">Project</th>
                  <th className="py-2 px-3 text-right text-gray-600 font-medium">Votes</th>
                  <th className="py-2 px-3 text-right text-gray-600 font-medium">Funds Received</th>
                  <th className="py-2 px-3 text-right text-gray-600 font-medium">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedByFundsProjects.map((project, index) => (
                  <tr key={project.id.toString()} 
                    className={index !== sortedByFundsProjects.length - 1 ? "border-b border-gray-100" : ""}
                  >
                    <td className="py-2 px-3 text-center">
                      {index === 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-500 text-white rounded-full font-bold">1</span>
                      ) : index === 1 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-400 text-white rounded-full font-bold">2</span>
                      ) : index === 2 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-700 text-white rounded-full font-bold">3</span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-200 text-gray-700 rounded-full">{index + 1}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-left text-gray-800">
                      <a 
                        className="hover:text-emerald-600"
                        href={`/campaign/${campaignId}/project/${project.id}`}
                      >
                        {project.name}
                      </a>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-gray-800">
                      {formatTokenAmount(BigInt(project.voteCount))}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600">
                        {Number(formatTokenAmount(BigInt(project.fundsReceived))).toFixed(1)} CELO
                      </td>
                      <td className="py-2 px-3 text-right text-gray-800">
                        {((Number(formatTokenAmount(BigInt(project.fundsReceived))) / Number(totalFunds)) * 100).toFixed(1)}%
                      </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-4 flex items-start border border-gray-200 shadow-sm">
            <Info className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-gray-600">
              No projects received funds. This might happen if no projects received votes or if all projects were rejected.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FundDistributionTable;