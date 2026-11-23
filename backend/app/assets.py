from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Asset
from app.schemas import AssetCreate, AssetRead

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("", response_model=list[AssetRead])
def list_assets(db: Session = Depends(get_db)) -> list[Asset]:
    return list(
        db.scalars(select(Asset).order_by(Asset.asset_tag, Asset.id))
    )


@router.post(
    "",
    response_model=AssetRead,
    status_code=status.HTTP_201_CREATED,
)
def create_asset(payload: AssetCreate, db: Session = Depends(get_db)) -> Asset:
    asset = Asset(**payload.model_dump())
    db.add(asset)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        database_message = str(error.orig).lower()
        if (
            "uq_assets_asset_tag" in database_message
            or "assets.asset_tag" in database_message
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An asset with this asset tag already exists.",
            ) from error
        raise

    db.refresh(asset)
    return asset
