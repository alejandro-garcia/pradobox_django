from abc import ABC, abstractmethod
from typing import TypeVar, Generic, List, Optional

EntityType = TypeVar('EntityType')
IdType = TypeVar('IdType')


class Repository(ABC, Generic[EntityType, IdType]):
    
    # @abstractmethod
    # def save(self, entity: EntityType) -> EntityType:
    #     pass
    
    @abstractmethod
    def find_by_id(self, entity_id: IdType) -> Optional[EntityType]:
        pass
    
    @abstractmethod
    def find_all(self) -> List[EntityType]:
        pass
    
    # @abstractmethod
    # def delete(self, entity_id: IdType) -> None:
    #     pass