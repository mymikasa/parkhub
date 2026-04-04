"use client";

import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useParkingLots } from "@/lib/parking-lot/hooks";
import { useTenants } from "@/lib/tenant/hooks";
import { usePermissions, useUser } from "@/lib/auth/hooks";
import { Calculator } from "lucide-react";
import { ParkingLotSelector } from "./_components/ParkingLotSelector";
import { BillingRuleEditor } from "./_components/BillingRuleEditor";
import { FeeCalculatorDialog } from "./_components/FeeCalculatorDialog";

export default function BillingRulesPage() {
  const permissions = usePermissions();
  const user = useUser();
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [selectedLotId, setSelectedLotId] = useState<string>("");
  const [calcOpen, setCalcOpen] = useState(false);

  // For platform_admin, load tenant list
  const { data: tenantsData } = useTenants({}, permissions.isPlatformAdmin);

  // Determine which tenant to query
  const activeTenantId = permissions.isPlatformAdmin ? selectedTenantId : (user?.tenant_id || "");

  // Load parking lots for active tenant
  const { data: lotsData, isLoading: lotsLoading } = useParkingLots(
    { tenant_id: activeTenantId, page: 1, page_size: 100 },
    !!activeTenantId
  );

  const parkingLots = useMemo(() => lotsData?.items || [], [lotsData?.items]);

  // Auto-select first lot
  useEffect(() => {
    if (parkingLots.length > 0 && !selectedLotId) {
      setSelectedLotId(parkingLots[0].id);
    }
  }, [parkingLots, selectedLotId]);

  // Reset lot selection when tenant changes
  useEffect(() => {
    setSelectedLotId("");
  }, [activeTenantId]);

  // Auto-select first tenant for platform admin
  useEffect(() => {
    if (permissions.isPlatformAdmin && tenantsData?.items?.length && !selectedTenantId) {
      setSelectedTenantId(tenantsData.items[0].id);
    }
  }, [permissions.isPlatformAdmin, tenantsData, selectedTenantId]);

  const hasLots = parkingLots.length > 0;
  const selectedLot = parkingLots.find((l) => l.id === selectedLotId);

  return (
    <>
      <Header
        title="计费规则配置"
        description="设置各停车场的计费规则，支持免费时长、按时计费、每日封顶"
        actions={
          hasLots ? (
            <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
              <DialogTrigger className="h-10 px-5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
                <Calculator className="h-4 w-4 text-gray-400" />
                费用计算器
              </DialogTrigger>
              <FeeCalculatorDialog parkingLots={parkingLots} />
            </Dialog>
          ) : undefined
        }
      />
      <div className="px-8 py-6 space-y-6">
        {/* Platform admin tenant selector */}
        {permissions.isPlatformAdmin && (
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-gray-500 whitespace-nowrap">选择租户</Label>
            <Select value={selectedTenantId} onValueChange={(v) => setSelectedTenantId(v ?? "")}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="请选择租户" />
              </SelectTrigger>
              <SelectContent>
                {tenantsData?.items?.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Left panel: parking lot list */}
          <div className="col-span-4">
            <ParkingLotSelector
              parkingLots={parkingLots}
              selectedLotId={selectedLotId}
              onSelect={setSelectedLotId}
            />
          </div>

          {/* Right panel: billing rule editor */}
          <div className="col-span-8">
            {selectedLotId && hasLots ? (
              <BillingRuleEditor parkingLotId={selectedLotId} lotName={selectedLot?.name || ""} />
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Calculator className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {hasLots ? "请选择一个停车场" : "暂无停车场，请先创建停车场后配置计费规则"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
