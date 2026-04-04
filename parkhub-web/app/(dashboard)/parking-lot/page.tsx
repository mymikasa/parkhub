"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/icons/FontAwesome";
import { faMagnifyingGlass, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Input } from "@/components/ui/input";
import { ParkingCircle } from "lucide-react";
import { useParkingLots, useParkingLotStats } from "@/lib/parking-lot/hooks";
import { GateConfigDialog } from "@/components/parking-lot/gate-config-dialog";
import type { ParkingLot } from "@/lib/parking-lot/types";
import { ParkingLotCard } from "./_components/ParkingLotCard";
import { ParkingLotStats } from "./_components/ParkingLotStats";
import { CreateParkingLotDialog } from "./_components/CreateParkingLotDialog";
import { EditParkingLotDialog } from "./_components/EditParkingLotDialog";

export default function ParkingLotPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: lotsData, isLoading, refetch } = useParkingLots({ search: debouncedSearch });
  const { data: stats, isLoading: isLoadingStats } = useParkingLotStats();
  const lots = lotsData?.items || [];

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGateConfigOpen, setIsGateConfigOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);

  return (
    <>
      <header className="bg-white border-b border-surface-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">停车场管理</h1>
            <p className="text-sm text-gray-500 mt-0.5">管理旗下所有停车场及出入口配置</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Icon icon={faMagnifyingGlass} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="搜索车场..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-64 rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm placeholder:text-gray-400 focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/10"
              />
            </div>
            <button onClick={() => setIsCreateDialogOpen(true)} className="btn-primary h-10 px-5 rounded-lg text-white text-sm font-medium flex items-center gap-2">
              <Icon icon={faPlus} size="sm" />
              新建车场
            </button>
          </div>
        </div>
      </header>

      <ParkingLotStats stats={stats} isLoading={isLoadingStats} />

      <div className="px-8 pb-8">
        <div className="grid grid-cols-2 gap-5">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-surface-border p-6 animate-pulse">
                <div className="h-40 bg-gray-200 rounded" />
              </div>
            ))
          ) : lots.length === 0 ? (
            <div className="col-span-2 bg-white rounded-xl border border-surface-border p-12 text-center">
              <ParkingCircle className="h-12 w-12 mx-auto text-gray-300" />
              <p className="text-gray-500 mt-4">{searchQuery ? "未找到匹配的停车场" : "暂无停车场数据"}</p>
            </div>
          ) : (
            lots.map((lot) => (
              <ParkingLotCard
                key={lot.id}
                lot={lot}
                onEdit={() => { setSelectedLot(lot); setIsEditDialogOpen(true); }}
                onConfig={() => { setSelectedLot(lot); setIsGateConfigOpen(true); }}
              />
            ))
          )}
        </div>
      </div>

      <CreateParkingLotDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onSuccess={() => { setIsCreateDialogOpen(false); refetch(); }} />
      <EditParkingLotDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} lot={selectedLot} onSuccess={() => { setIsEditDialogOpen(false); setSelectedLot(null); refetch(); }} />
      {selectedLot && (
        <GateConfigDialog open={isGateConfigOpen} onOpenChange={(open) => { setIsGateConfigOpen(open); if (!open) setSelectedLot(null); }} parkingLotId={selectedLot.id} parkingLotName={selectedLot.name} />
      )}
    </>
  );
}
