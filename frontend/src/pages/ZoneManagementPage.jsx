import { Boxes, Plus, RefreshCw, Settings, Trash2, X } from "lucide-react";
import React, { useEffect, useState } from "react";

import { zonesApi, lockersApi } from "../api/modules";
import DataTable from "../components/DataTable";
import MessageBox from "../components/MessageBox";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

const SIZE_OPTIONS = [
  { value: "small", label: "小" },
  { value: "medium", label: "中" },
  { value: "large", label: "大" },
];

function ZoneForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    code: initial?.code || "",
    description: initial?.description || "",
    is_active: initial?.is_active !== false,
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.code.trim()) {
      setError("分区名称和编码不能为空");
      return;
    }
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <MessageBox type="error">{error}</MessageBox>
      <label>
        <span>分区编码</span>
        <input
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          placeholder="如：A、B、C..."
          maxLength={20}
        />
      </label>
      <label>
        <span>分区名称</span>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="如：A区、一层北区..."
          maxLength={50}
        />
      </label>
      <label>
        <span>描述</span>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="位置说明等"
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          style={{ width: "auto", minHeight: 0 }}
        />
        <span>启用该分区</span>
      </label>
      <div className="row-actions" style={{ marginTop: 10 }}>
        <button type="submit">保存</button>
        <button type="button" className="ghost" onClick={onCancel}>取消</button>
      </div>
    </form>
  );
}

function BatchCreateForm({ zoneId, onDone }) {
  const [form, setForm] = useState({
    start_index: 1,
    count: 12,
    size: "medium",
    prefix: "",
  });
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    try {
      const res = await zonesApi.batchCreateCells(zoneId, {
        ...form,
        zone_id: zoneId,
      });
      setResult(res);
      if (res.error_count === 0) {
        onDone();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <MessageBox type="error">{error}</MessageBox>
      {result ? (
        <MessageBox type="success">
          成功创建 {result.created_count} 个柜格
          {result.error_count > 0 ? `，${result.error_count} 个失败：${result.errors.join("；")}` : ""}
        </MessageBox>
      ) : null}
      <form className="form-panel" onSubmit={handleSubmit} style={{ marginTop: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            <span>起始编号</span>
            <input
              type="number"
              min={1}
              value={form.start_index}
              onChange={(e) => setForm({ ...form, start_index: Number(e.target.value) })}
            />
          </label>
          <label>
            <span>数量</span>
            <input
              type="number"
              min={1}
              max={200}
              value={form.count}
              onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}
            />
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            <span>默认尺寸</span>
            <select value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}>
              {SIZE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>编号前缀（空则使用分区编码）</span>
            <input
              value={form.prefix}
              onChange={(e) => setForm({ ...form, prefix: e.target.value })}
              placeholder="默认使用分区编码"
              maxLength={10}
            />
          </label>
        </div>
        <div className="row-actions">
          <button type="submit">批量创建</button>
        </div>
      </form>
    </div>
  );
}

function CellRowEdit({ cell, onSave, onCancel }) {
  const [size, setSize] = useState(cell.size);
  const [error, setError] = useState("");

  const handleSave = async () => {
    try {
      await lockersApi.updateSize(cell.id, size);
      onSave();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      {error ? <MessageBox type="error">{error}</MessageBox> : null}
      <div style={{ display: "flex", gap: 8 }}>
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          style={{ minWidth: 80 }}
        >
          {SIZE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button className="ghost" onClick={handleSave}>保存</button>
        <button className="ghost" onClick={onCancel}>取消</button>
      </div>
    </>
  );
}

function ZoneDetailPanel({ zone, onClose, onRefreshZones }) {
  const [cells, setCells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingCellId, setEditingCellId] = useState(null);
  const [success, setSuccess] = useState("");

  const loadCells = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await zonesApi.listCells(zone.id);
      setCells(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCells();
  }, [zone.id]);

  const handleDeleteCell = async (cell) => {
    if (!window.confirm(`确定删除柜格 ${cell.code} 吗？`)) return;
    setError("");
    try {
      await lockersApi.deleteCell(cell.id);
      loadCells();
      onRefreshZones();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleMaintenance = async (cell, isMaintenance) => {
    setError("");
    try {
      await lockersApi.toggleMaintenance(cell.id, isMaintenance);
      loadCells();
    } catch (err) {
      setError(err.message);
    }
  };

  const sizeCounts = {
    small: cells.filter((c) => c.size === "small").length,
    medium: cells.filter((c) => c.size === "medium").length,
    large: cells.filter((c) => c.size === "large").length,
  };

  return (
    <div className="zone-detail-panel">
      <div className="panel-title">
        <h2>
          {zone.code} - {zone.name} 的柜格管理
        </h2>
        <button className="ghost" onClick={onClose}><X size={16} />关闭</button>
      </div>

      <MessageBox type="error">{error}</MessageBox>
      <MessageBox type="success">{success}</MessageBox>

      <div className="metric-grid compact" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <MetricCard title="小号柜格" value={sizeCounts.small} icon={Boxes} />
        <MetricCard title="中号柜格" value={sizeCounts.medium} icon={Boxes} />
        <MetricCard title="大号柜格" value={sizeCounts.large} icon={Boxes} />
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-title">
          <h2>批量创建柜格</h2>
        </div>
        <BatchCreateForm
          zoneId={zone.id}
          onDone={() => {
            loadCells();
            onRefreshZones();
            setSuccess("批量创建完成");
            setTimeout(() => setSuccess(""), 3000);
          }}
        />
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-title">
          <h2>柜格列表（{cells.length}）</h2>
          <button className="ghost" onClick={loadCells}><RefreshCw size={16} />刷新</button>
        </div>
        {loading ? (
          <p style={{ color: "#98a2b3" }}>加载中...</p>
        ) : (
          <DataTable
            rows={cells}
            columns={[
              { key: "code", title: "柜格编码" },
              {
                key: "size",
                title: "尺寸",
                render: (row) =>
                  editingCellId === row.id ? (
                    <CellRowEdit
                      cell={row}
                      onSave={() => {
                        setEditingCellId(null);
                        loadCells();
                      }}
                      onCancel={() => setEditingCellId(null)}
                    />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{row.size_label}</span>
                      <button
                        className="ghost"
                        style={{ padding: "4px 8px", minHeight: 0 }}
                        onClick={() => setEditingCellId(row.id)}
                      >
                        <Settings size={14} />
                      </button>
                    </div>
                  ),
              },
              {
                key: "status",
                title: "状态",
                render: (row) => (
                  <StatusBadge status={row.status} label={row.status_label} />
                ),
              },
              { key: "temperature", title: "温度", render: (r) => `${r.temperature}°C` },
              {
                key: "actions",
                title: "操作",
                render: (row) => (
                  <div className="row-actions">
                    {row.status === "maintenance" ? (
                      <button
                        className="ghost"
                        onClick={() => handleToggleMaintenance(row, false)}
                      >
                        恢复使用
                      </button>
                    ) : (
                      <button
                        className="ghost"
                        onClick={() => handleToggleMaintenance(row, true)}
                      >
                        标记维护
                      </button>
                    )}
                    <button
                      className="ghost danger"
                      onClick={() => handleDeleteCell(row)}
                    >
                      <Trash2 size={15} />删除
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </section>
    </div>
  );
}

export default function ZoneManagementPage() {
  const [zones, setZones] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);

  const loadZones = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await zonesApi.list();
      setZones(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, []);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleCreate = async (form) => {
    await zonesApi.create(form);
    setShowForm(false);
    loadZones();
    showSuccess("分区创建成功");
  };

  const handleUpdate = async (form) => {
    await zonesApi.update(editingZone.id, form);
    setEditingZone(null);
    loadZones();
    showSuccess("分区更新成功");
  };

  const handleDelete = async (zone) => {
    if (!window.confirm(`确定删除分区「${zone.name}」吗？存在柜格的分区无法删除。`)) return;
    setError("");
    try {
      await zonesApi.delete(zone.id);
      loadZones();
      if (selectedZone?.id === zone.id) setSelectedZone(null);
      showSuccess("分区已删除");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (zone) => {
    setError("");
    try {
      await zonesApi.toggleActive(zone.id);
      loadZones();
    } catch (err) {
      setError(err.message);
    }
  };

  const totalCells = zones.reduce((sum, z) => sum + (z.cell_count || 0), 0);
  const activeZones = zones.filter((z) => z.is_active).length;

  return (
    <>
      <PageHeader
        title="分区管理"
        description="管理柜机分区，维护每个分区的柜格数量、尺寸和启用状态。"
        action={
          <button onClick={() => { setEditingZone(null); setShowForm(true); }}>
            <Plus size={16} />新建分区
          </button>
        }
      />

      <div className="metric-grid compact">
        <MetricCard title="分区总数" value={zones.length} />
        <MetricCard title="启用分区" value={activeZones} />
        <MetricCard title="停用分区" value={zones.length - activeZones} />
        <MetricCard title="柜格总数" value={totalCells} />
      </div>

      <MessageBox type="error">{error}</MessageBox>
      <MessageBox type="success">{success}</MessageBox>

      <div className="work-grid" style={{ gridTemplateColumns: selectedZone ? "1fr 1fr" : "1fr" }}>
        <section className="panel">
          {showForm ? (
            <>
              <div className="panel-title">
                <h2>新建分区</h2>
                <button className="ghost" onClick={() => setShowForm(false)}>
                  <X size={16} />
                </button>
              </div>
              <ZoneForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
            </>
          ) : editingZone ? (
            <>
              <div className="panel-title">
                <h2>编辑分区</h2>
                <button className="ghost" onClick={() => setEditingZone(null)}>
                  <X size={16} />
                </button>
              </div>
              <ZoneForm
                initial={editingZone}
                onSubmit={handleUpdate}
                onCancel={() => setEditingZone(null)}
              />
            </>
          ) : (
            <>
              <div className="panel-title">
                <h2>分区列表</h2>
                <button className="ghost" onClick={loadZones}>
                  <RefreshCw size={16} />刷新
                </button>
              </div>
              {loading ? (
                <p style={{ color: "#98a2b3" }}>加载中...</p>
              ) : (
                <DataTable
                  rows={zones}
                  columns={[
                    { key: "code", title: "编码" },
                    { key: "name", title: "名称" },
                    {
                      key: "is_active",
                      title: "状态",
                      render: (row) => (
                        <StatusBadge
                          status={row.is_active ? "sent" : "failed"}
                          label={row.is_active_label}
                        />
                      ),
                    },
                    { key: "cell_count", title: "柜格数量" },
                    { key: "description", title: "描述", render: (r) => r.description || "-" },
                    {
                      key: "actions",
                      title: "操作",
                      render: (row) => (
                        <div className="row-actions">
                          <button
                            className="ghost"
                            onClick={() => setSelectedZone(row)}
                          >
                            <Settings size={15} />柜格
                          </button>
                          <button
                            className="ghost"
                            onClick={() => handleToggleActive(row)}
                          >
                            {row.is_active ? "停用" : "启用"}
                          </button>
                          <button
                            className="ghost"
                            onClick={() => { setShowForm(false); setEditingZone(row); }}
                          >
                            编辑
                          </button>
                          <button
                            className="ghost danger"
                            onClick={() => handleDelete(row)}
                          >
                            <Trash2 size={15} />删除
                          </button>
                        </div>
                      ),
                    },
                  ]}
                />
              )}
            </>
          )}
        </section>

        {selectedZone ? (
          <section className="panel">
            <ZoneDetailPanel
              zone={selectedZone}
              onClose={() => setSelectedZone(null)}
              onRefreshZones={loadZones}
            />
          </section>
        ) : null}
      </div>
    </>
  );
}
