from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import TypeVar, Generic

InputType = TypeVar('InputType')
OutputType = TypeVar('OutputType')


class UseCase(ABC, Generic[InputType, OutputType]):
    
    @abstractmethod
    def execute(self, input_data: InputType) -> OutputType:
        pass