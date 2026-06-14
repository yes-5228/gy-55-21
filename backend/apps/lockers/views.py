from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import LockerCell, LockerZone
from .serializers import (
    BatchCreateCellsSerializer,
    LockerCellSerializer,
    LockerZoneSerializer,
    ToggleCellMaintenanceSerializer,
)


class LockerZoneViewSet(viewsets.ModelViewSet):
    queryset = LockerZone.objects.all()
    serializer_class = LockerZoneSerializer

    def get_queryset(self):
        queryset = super().get_queryset().annotate(_cell_count=Count("cells"))
        return queryset

    def destroy(self, request, *args, **kwargs):
        zone = self.get_object()
        if zone.cells.exists():
            return Response(
                {"detail": "该分区下存在柜格，无法删除。请先删除柜格。"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def toggle_active(self, request, pk=None):
        zone = self.get_object()
        zone.is_active = not zone.is_active
        zone.save(update_fields=["is_active", "updated_at"])
        return Response(self.get_serializer(zone).data)

    @action(detail=True, methods=["get"])
    def cells(self, request, pk=None):
        zone = self.get_object()
        cells = zone.cells.all()
        serializer = LockerCellSerializer(cells, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def batch_create_cells(self, request, pk=None):
        zone = self.get_object()
        serializer = BatchCreateCellsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        start_index = data["start_index"]
        count = data["count"]
        size = data["size"]
        prefix = data.get("prefix") or zone.code

        created = []
        errors = []

        for i in range(count):
            index = start_index + i
            cell_code = f"{prefix}{index:02d}"

            if LockerCell.objects.filter(code=cell_code).exists():
                errors.append(f"柜格编码 {cell_code} 已存在，跳过")
                continue

            cell = LockerCell.objects.create(
                code=cell_code,
                zone=zone,
                zone_name=zone.name,
                size=size,
                temperature=24,
            )
            created.append(cell)

        return Response(
            {
                "created_count": len(created),
                "error_count": len(errors),
                "errors": errors,
                "cells": LockerCellSerializer(created, many=True).data,
            }
        )


class LockerCellViewSet(viewsets.ModelViewSet):
    queryset = LockerCell.objects.all()
    serializer_class = LockerCellSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        zone_id = self.request.query_params.get("zone")
        if zone_id:
            queryset = queryset.filter(zone_id=zone_id)
        return queryset

    @action(detail=False, methods=["get"])
    def summary(self, request):
        total = LockerCell.objects.count()
        by_status = {
            item["status"]: item["count"]
            for item in LockerCell.objects.values("status").annotate(count=Count("id"))
        }
        return Response(
            {
                "total": total,
                "empty": by_status.get(LockerCell.Status.EMPTY, 0),
                "occupied": by_status.get(LockerCell.Status.OCCUPIED, 0),
                "open": by_status.get(LockerCell.Status.OPEN, 0),
                "maintenance": by_status.get(LockerCell.Status.MAINTENANCE, 0),
            }
        )

    @action(detail=True, methods=["post"])
    def mark_maintenance(self, request, pk=None):
        cell = self.get_object()
        cell.status = LockerCell.Status.MAINTENANCE
        cell.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(cell).data)

    @action(detail=True, methods=["post"])
    def toggle_maintenance(self, request, pk=None):
        cell = self.get_object()
        serializer = ToggleCellMaintenanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_maintenance = serializer.validated_data["is_maintenance"]
        if is_maintenance:
            cell.status = LockerCell.Status.MAINTENANCE
        else:
            cell.status = LockerCell.Status.EMPTY

        cell.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(cell).data)

    @action(detail=True, methods=["post"])
    def reset(self, request, pk=None):
        cell = self.get_object()
        cell.status = LockerCell.Status.EMPTY
        cell.last_opened_at = timezone.now()
        cell.save(update_fields=["status", "last_opened_at", "updated_at"])
        return Response(self.get_serializer(cell).data)

    @action(detail=True, methods=["patch"])
    def update_size(self, request, pk=None):
        cell = self.get_object()
        new_size = request.data.get("size")
        if new_size not in [choice[0] for choice in LockerCell.Size.choices]:
            return Response({"detail": "无效的尺寸值"}, status=status.HTTP_400_BAD_REQUEST)
        cell.size = new_size
        cell.save(update_fields=["size", "updated_at"])
        return Response(self.get_serializer(cell).data)
