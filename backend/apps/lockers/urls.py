from rest_framework.routers import DefaultRouter

from .views import LockerCellViewSet, LockerZoneViewSet


router = DefaultRouter()
router.register("zones", LockerZoneViewSet, basename="locker-zone")
router.register("cells", LockerCellViewSet, basename="locker-cell")

urlpatterns = router.urls
